/**
 * OpenClaw Task Decomposer
 *
 * The middle-layer's job: take a user request, break it into subtasks,
 * fire concurrent requests to OpenClaw, and aggregate the results.
 *
 * This layer does NOT execute any tools itself. Everything is delegated
 * to the OpenClaw agent via the WebSocket chat relay.
 */

import { relayChatMessage, type ChatRelayOptions, type ChatRelayResult } from "./openclaw-chat-relay.js";

// ─── Types ────────────────────────────────────────────────────

export interface SubTask {
  id: string;
  description: string;
  prompt: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: ChatRelayResult;
}

export interface DecomposedTask {
  originalMessage: string;
  subtasks: SubTask[];
  aggregatedReply: string;
  totalDurationMs: number;
  strategy: "single" | "decomposed";
}

// ─── Decomposition heuristics ─────────────────────────────────

/**
 * Determines whether a user message should be decomposed into parallel
 * subtasks or sent as a single message to the OpenClaw agent.
 *
 * Returns an array of prompt strings — one per subtask. If the message
 * is simple, returns a single-element array (no decomposition).
 */
export function decomposeUserMessage(message: string): { prompts: string[]; strategy: "single" | "decomposed" } {
  const lower = message.toLowerCase().trim();

  // ── Multi-part requests (explicit "and", numbered lists, semicolons) ──

  // Numbered lists: "1. do X  2. do Y  3. do Z"
  const numberedItems = message.match(/(?:^|\n)\s*\d+[\.\)]\s+.+/g);
  if (numberedItems && numberedItems.length >= 2) {
    const prompts = numberedItems.map((item) => item.replace(/^\s*\d+[\.\)]\s+/, "").trim()).filter(Boolean);
    if (prompts.length >= 2) return { prompts, strategy: "decomposed" };
  }

  // Bullet lists: "- do X\n- do Y"
  const bulletItems = message.match(/(?:^|\n)\s*[-•*]\s+.+/g);
  if (bulletItems && bulletItems.length >= 2) {
    const prompts = bulletItems.map((item) => item.replace(/^\s*[-•*]\s+/, "").trim()).filter(Boolean);
    if (prompts.length >= 2) return { prompts, strategy: "decomposed" };
  }

  // Semicolon-separated: "do X; do Y; do Z"
  if (message.includes(";") && !message.includes("http")) {
    const parts = message.split(";").map((s) => s.trim()).filter((s) => s.length > 5);
    if (parts.length >= 2) return { prompts: parts, strategy: "decomposed" };
  }

  // "and also" / "and then" / "as well as" compound requests
  const compoundPatterns = /\b(?:and also|and then|as well as|additionally|plus also|then also)\b/i;
  if (compoundPatterns.test(message) && message.length > 60) {
    const splitPoints = message.split(compoundPatterns).map((s) => s.trim()).filter((s) => s.length > 10);
    if (splitPoints.length >= 2) return { prompts: splitPoints, strategy: "decomposed" };
  }

  // Default: single message, relay directly
  return { prompts: [message], strategy: "single" };
}

// ─── Concurrent Executor ──────────────────────────────────────

/**
 * Fires all subtasks concurrently to the OpenClaw agent and aggregates results.
 * Each subtask gets its own WebSocket connection to the gateway.
 *
 * @param message   – Original user message
 * @param relayOpts – Gateway connection options
 * @returns         – Aggregated decomposed task result
 */
export async function executeDecomposedTask(
  message: string,
  relayOpts: ChatRelayOptions,
): Promise<DecomposedTask> {
  const start = Date.now();
  const { prompts, strategy } = decomposeUserMessage(message);

  const subtasks: SubTask[] = prompts.map((prompt, i) => ({
    id: `sub_${i}`,
    description: prompt.slice(0, 80),
    prompt,
    status: "pending" as const,
  }));

  // Fire all subtasks concurrently
  const results = await Promise.allSettled(
    subtasks.map(async (subtask) => {
      subtask.status = "running";
      const result = await relayChatMessage(subtask.prompt, relayOpts);
      subtask.status = result.ok ? "completed" : "failed";
      subtask.result = result;
      return result;
    }),
  );

  // Aggregate replies
  const replies: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    if (r.status === "fulfilled" && r.value.ok && r.value.reply) {
      if (strategy === "decomposed") {
        replies.push(`**[${i + 1}]** ${r.value.reply}`);
      } else {
        replies.push(r.value.reply);
      }
    } else if (r.status === "fulfilled" && !r.value.ok) {
      replies.push(`**[${i + 1}]** ❌ ${r.value.error ?? "Failed"}`);
    } else if (r.status === "rejected") {
      const err = r.reason instanceof Error ? r.reason.message : String(r.reason);
      replies.push(`**[${i + 1}]** ❌ ${err}`);
    }
  }

  return {
    originalMessage: message,
    subtasks,
    aggregatedReply: replies.join("\n\n"),
    totalDurationMs: Date.now() - start,
    strategy,
  };
}
