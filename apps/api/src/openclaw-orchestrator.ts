/**
 * OpenClaw Orchestrator — The Brain
 *
 * Takes a user prompt, intelligently decomposes it into subtasks,
 * executes them concurrently (chat relay + tool invocations),
 * retries failures, and synthesizes a final response.
 *
 * Architecture:
 *   User Prompt
 *     → [1] LLM Decomposition (or heuristic fallback)
 *     → [2] Classify each subtask (chat vs tool_invoke)
 *     → [3] Concurrent execution with retry
 *     → [4] Result aggregation
 *     → [5] LLM Synthesis (or concatenation fallback)
 *     → Final Response
 */

import { randomUUID } from "node:crypto";
import { relayChatMessage, type ChatRelayOptions, type ChatRelayResult } from "./openclaw-chat-relay.js";
import { decomposeUserMessage } from "./openclaw-task-decomposer.js";

// ─── Types ────────────────────────────────────────────────────

export type SubTaskType = "chat" | "tool_invoke" | "info_query";

export interface OrchestratorSubTask {
  id: string;
  type: SubTaskType;
  prompt: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "retrying";
  attempts: number;
  maxAttempts: number;
  result?: ChatRelayResult;
  toolInvocation?: { tool: string; action?: string; args?: Record<string, unknown> };
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  error?: string;
}

export interface OrchestratorPlan {
  planId: string;
  originalMessage: string;
  strategy: "single" | "decomposed" | "hybrid";
  decompositionMethod: "llm" | "heuristic";
  subtasks: OrchestratorSubTask[];
}

export interface OrchestratorResult {
  planId: string;
  originalMessage: string;
  strategy: "single" | "decomposed" | "hybrid";
  decompositionMethod: "llm" | "heuristic";
  subtasks: OrchestratorSubTaskResult[];
  aggregatedReply: string;
  synthesisMethod: "llm" | "concatenation";
  totalDurationMs: number;
  completedCount: number;
  failedCount: number;
}

export interface OrchestratorSubTaskResult {
  id: string;
  type: SubTaskType;
  description: string;
  status: "completed" | "failed";
  attempts: number;
  durationMs: number;
  error?: string;
  replyPreview?: string;
}

export interface OrchestratorConfig {
  /** Max subtasks to run concurrently (fan-out limit) */
  maxConcurrency: number;
  /** Max retry attempts per subtask */
  maxRetries: number;
  /** Base retry delay in ms (exponential backoff) */
  retryBaseDelayMs: number;
  /** Overall timeout for the entire orchestration */
  totalTimeoutMs: number;
  /** Per-subtask timeout */
  subtaskTimeoutMs: number;
  /** Whether to use LLM for decomposition (falls back to heuristic) */
  useLlmDecomposition: boolean;
  /** Whether to use LLM for result synthesis */
  useLlmSynthesis: boolean;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxConcurrency: 5,
  maxRetries: 2,
  retryBaseDelayMs: 1000,
  totalTimeoutMs: 120_000,
  subtaskTimeoutMs: 60_000,
  useLlmDecomposition: true,
  useLlmSynthesis: true,
};

// ─── LLM Interface ────────────────────────────────────────────

export interface OrchestratorLlm {
  /**
   * Decompose a user message into subtasks using LLM intelligence.
   * Returns an array of { prompt, type, description } objects.
   */
  decompose(message: string): Promise<{
    subtasks: Array<{ prompt: string; type: SubTaskType; description: string }>;
    strategy: "single" | "decomposed" | "hybrid";
  } | null>;

  /**
   * Synthesize multiple subtask results into a coherent final response.
   */
  synthesize(
    originalMessage: string,
    results: Array<{ description: string; reply: string; status: string }>,
  ): Promise<string | null>;
}

export interface OrchestratorEngine {
  execute(
    message: string,
    relayOpts: ChatRelayOptions,
    toolInvoke?: ToolInvokeFunction,
  ): Promise<OrchestratorResult>;
}

// ─── OpenAI-based LLM Implementation ─────────────────────────

/**
 * Uses the OpenAI Responses API for decomposition and synthesis.
 * Falls back to null (triggering heuristic fallback) on any error.
 */
export class OpenAiOrchestratorLlm implements OrchestratorLlm {
  private client: import("openai").default;
  private model: string;

  constructor(client: import("openai").default, model?: string) {
    this.client = client;
    this.model = model ?? "gpt-4.1-mini";
  }

  async decompose(message: string) {
    try {
      const response = await this.client.responses.create({
        model: this.model,
        input: [
          {
            role: "system",
            content: `You are a task decomposition engine for an AI agent orchestrator.
Your job is to analyze a user message and decide whether it should be:
1. Sent as a SINGLE message to the agent (simple questions, greetings, etc.)
2. DECOMPOSED into multiple independent subtasks that can run in parallel
3. Handled as a HYBRID mix of tool invocations and chat messages

For each subtask, classify it as:
- "chat": a natural language question/instruction for the agent
- "tool_invoke": a specific tool that should be invoked (include tool name)
- "info_query": an informational query that can be answered by the agent

IMPORTANT: Only decompose if the tasks are truly independent. If they depend on each other, keep them as a single message.

Reply ONLY with valid JSON, no markdown, no explanation:
{
  "strategy": "single" | "decomposed" | "hybrid",
  "subtasks": [
    { "prompt": "the exact prompt to send", "type": "chat" | "tool_invoke" | "info_query", "description": "2-5 word label" }
  ]
}

If the message contains explicit tool names (like "run list_sessions" or "invoke web_fetch"), set type to "tool_invoke".
If the message has numbered items, bullet points, or "and also" compound requests, decompose them.
Simple questions should be strategy "single" with one subtask.`,
          },
          { role: "user", content: message },
        ],
        max_output_tokens: 500,
      });

      const text = this.extractText(response);
      if (!text) return null;

      const parsed = JSON.parse(text);
      if (!parsed.subtasks || !Array.isArray(parsed.subtasks)) return null;

      return {
        strategy: parsed.strategy ?? "single",
        subtasks: parsed.subtasks.map((s: Record<string, unknown>) => ({
          prompt: String(s.prompt ?? ""),
          type: (s.type === "tool_invoke" || s.type === "info_query") ? s.type : "chat",
          description: String(s.description ?? "subtask"),
        })).filter((s: { prompt: string }) => s.prompt.length > 0),
      };
    } catch (err) {
      console.warn("[orchestrator] LLM decomposition failed, falling back to heuristic:", err instanceof Error ? err.message : err);
      return null;
    }
  }

  async synthesize(
    originalMessage: string,
    results: Array<{ description: string; reply: string; status: string }>,
  ) {
    try {
      const resultsText = results.map((r, i) =>
        `[Subtask ${i + 1}: ${r.description}] (${r.status})\n${r.reply || "(no response)"}`
      ).join("\n\n---\n\n");

      const response = await this.client.responses.create({
        model: this.model,
        input: [
          {
            role: "system",
            content: `You are a response synthesizer. The user asked a question that was broken into subtasks.
Each subtask was sent to an AI agent and produced a result. Your job is to combine these results into
a single, coherent, well-formatted response that directly answers the user's original question.

Rules:
- Be concise but complete
- If some subtasks failed, mention what couldn't be done
- Don't mention the decomposition process itself
- Format the response naturally, as if a single agent answered
- Use markdown formatting where helpful`,
          },
          {
            role: "user",
            content: `Original question: "${originalMessage}"\n\nSubtask results:\n\n${resultsText}`,
          },
        ],
        max_output_tokens: 1000,
      });

      return this.extractText(response) || null;
    } catch (err) {
      console.warn("[orchestrator] LLM synthesis failed, falling back to concatenation:", err instanceof Error ? err.message : err);
      return null;
    }
  }

  private extractText(response: import("openai").Responses.Response): string {
    if (response.output_text) return response.output_text.trim();
    const output = response.output ?? [];
    for (const item of output) {
      if ("content" in item && Array.isArray(item.content)) {
        for (const block of item.content) {
          if (block.type === "output_text") return block.text.trim();
        }
      }
    }
    return "";
  }
}

// ─── Tool Invoke via Middleware ────────────────────────────────

export interface ToolInvokeFunction {
  (tool: string, action?: string, args?: Record<string, unknown>): Promise<{
    ok: boolean;
    status: string;
    httpStatus?: number;
    responseSummary?: string;
    error?: string;
    durationMs?: number;
  }>;
}

// ─── Orchestrator Engine ──────────────────────────────────────

export class OpenClawOrchestrator implements OrchestratorEngine {
  private config: OrchestratorConfig;
  private llm: OrchestratorLlm | null;

  constructor(
    config?: Partial<OrchestratorConfig>,
    llm?: OrchestratorLlm | null,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.llm = llm ?? null;
  }

  /**
   * Main entry point: take a user message, decompose, execute, synthesize.
   */
  async execute(
    message: string,
    relayOpts: ChatRelayOptions,
    toolInvoke?: ToolInvokeFunction,
  ): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const planId = `plan_${randomUUID().slice(0, 12)}`;

    // ── Step 1: Decompose ──
    const plan = await this.decompose(planId, message);
    console.log(`[orchestrator] Plan ${planId}: strategy=${plan.strategy} method=${plan.decompositionMethod} subtasks=${plan.subtasks.length}`);

    // ── Step 2: Execute all subtasks concurrently (with concurrency limit) ──
    await this.executeSubtasks(plan, relayOpts, toolInvoke);

    // ── Step 3: Aggregate & synthesize ──
    const aggregatedReply = await this.synthesizeResults(plan);

    const result: OrchestratorResult = {
      planId,
      originalMessage: message,
      strategy: plan.strategy,
      decompositionMethod: plan.decompositionMethod,
      subtasks: plan.subtasks.map((s) => ({
        id: s.id,
        type: s.type,
        description: s.description,
        status: s.status === "completed" ? "completed" : "failed",
        attempts: s.attempts,
        durationMs: s.durationMs ?? 0,
        error: s.error,
        replyPreview: s.result?.reply?.slice(0, 200),
      })),
      aggregatedReply: aggregatedReply.text,
      synthesisMethod: aggregatedReply.method,
      totalDurationMs: Date.now() - startTime,
      completedCount: plan.subtasks.filter((s) => s.status === "completed").length,
      failedCount: plan.subtasks.filter((s) => s.status === "failed").length,
    };

    console.log(`[orchestrator] Plan ${planId} complete: ${result.completedCount}/${plan.subtasks.length} succeeded in ${result.totalDurationMs}ms`);
    return result;
  }

  // ── Step 1: Decomposition ──

  private async decompose(planId: string, message: string): Promise<OrchestratorPlan> {
    // Try LLM decomposition first
    if (this.config.useLlmDecomposition && this.llm) {
      try {
        const llmResult = await this.llm.decompose(message);
        if (llmResult && llmResult.subtasks.length > 0) {
          return {
            planId,
            originalMessage: message,
            strategy: llmResult.strategy as OrchestratorPlan["strategy"],
            decompositionMethod: "llm",
            subtasks: llmResult.subtasks.map((s, i) => ({
              id: `sub_${i}`,
              type: s.type,
              prompt: s.prompt,
              description: s.description,
              status: "pending" as const,
              attempts: 0,
              maxAttempts: this.config.maxRetries + 1,
            })),
          };
        }
      } catch (err) {
        console.warn("[orchestrator] LLM decomposition error, falling back:", err);
      }
    }

    // Fallback: heuristic decomposition
    return this.heuristicDecompose(planId, message);
  }

  private heuristicDecompose(planId: string, message: string): OrchestratorPlan {
    const { prompts, strategy } = decomposeUserMessage(message);

    // Detect tool invocations in prompts
    const subtasks = prompts.map((prompt, i) => {
      const toolMatch = prompt.match(/^(?:run|invoke|call|execute|use)\s+([a-z_]\w*)/i);
      const type: SubTaskType = toolMatch ? "tool_invoke" : "chat";

      return {
        id: `sub_${i}`,
        type,
        prompt,
        description: prompt.slice(0, 60),
        status: "pending" as const,
        attempts: 0,
        maxAttempts: this.config.maxRetries + 1,
        ...(toolMatch ? {
          toolInvocation: {
            tool: toolMatch[1]!,
          },
        } : {}),
      };
    });

    // Check for hybrid (mix of tool invokes and chats)
    const hasTools = subtasks.some((s) => s.type === "tool_invoke");
    const hasChat = subtasks.some((s) => s.type === "chat");
    const effectiveStrategy = hasTools && hasChat ? "hybrid" : strategy;

    return {
      planId,
      originalMessage: message,
      strategy: effectiveStrategy as OrchestratorPlan["strategy"],
      decompositionMethod: "heuristic",
      subtasks,
    };
  }

  // ── Step 2: Concurrent Execution with Retry ──

  private async executeSubtasks(
    plan: OrchestratorPlan,
    relayOpts: ChatRelayOptions,
    toolInvoke?: ToolInvokeFunction,
  ): Promise<void> {
    const { maxConcurrency, totalTimeoutMs } = this.config;
    const deadline = Date.now() + totalTimeoutMs;

    // Execute in batches respecting concurrency limit
    const pending = [...plan.subtasks];
    const executing: Promise<void>[] = [];

    const runSubtask = async (subtask: OrchestratorSubTask) => {
      while (subtask.attempts < subtask.maxAttempts && Date.now() < deadline) {
        subtask.attempts++;
        subtask.status = subtask.attempts > 1 ? "retrying" : "running";
        subtask.startedAt = Date.now();

        try {
          if (subtask.type === "tool_invoke" && subtask.toolInvocation && toolInvoke) {
            // Execute via tool invocation middleware
            const toolResult = await this.executeToolInvoke(subtask, toolInvoke);
            if (toolResult.ok) {
              subtask.status = "completed";
              subtask.result = {
                ok: true,
                reply: toolResult.responseSummary ?? `Tool ${subtask.toolInvocation.tool} executed successfully (HTTP ${toolResult.httpStatus})`,
                fragments: [toolResult.responseSummary ?? ""],
                durationMs: toolResult.durationMs ?? (Date.now() - subtask.startedAt),
              };
              subtask.completedAt = Date.now();
              subtask.durationMs = subtask.completedAt - subtask.startedAt;
              return; // Success, no retry needed
            }
            // Tool invocation failed but returned a response
            throw new Error(toolResult.error ?? `Tool invocation failed with HTTP ${toolResult.httpStatus}`);
          } else {
            // Execute via chat relay
            const relayResult = await this.executeChatRelay(subtask, {
              ...relayOpts,
              timeoutMs: Math.min(
                this.config.subtaskTimeoutMs,
                Math.max(10_000, deadline - Date.now()),
              ),
            });

            if (relayResult.ok && relayResult.reply) {
              subtask.status = "completed";
              subtask.result = relayResult;
              subtask.completedAt = Date.now();
              subtask.durationMs = subtask.completedAt - subtask.startedAt;
              return; // Success
            }

            // Empty reply but no error — still a success (agent may just not have much to say)
            if (relayResult.ok) {
              subtask.status = "completed";
              subtask.result = relayResult;
              subtask.completedAt = Date.now();
              subtask.durationMs = subtask.completedAt - subtask.startedAt;
              return;
            }

            throw new Error(relayResult.error ?? "Chat relay returned no reply");
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          subtask.error = errorMsg;
          console.warn(`[orchestrator] Subtask ${subtask.id} attempt ${subtask.attempts}/${subtask.maxAttempts} failed: ${errorMsg}`);

          // If we have more attempts, wait with exponential backoff
          if (subtask.attempts < subtask.maxAttempts && Date.now() < deadline) {
            const delay = this.config.retryBaseDelayMs * Math.pow(2, subtask.attempts - 1);
            const jitter = Math.random() * 500;
            await sleep(Math.min(delay + jitter, 10_000));
          }
        }
      }

      // All retries exhausted
      subtask.status = "failed";
      subtask.completedAt = Date.now();
      subtask.durationMs = (subtask.completedAt ?? Date.now()) - (subtask.startedAt ?? Date.now());
    };

    // Concurrency-limited execution
    for (const subtask of pending) {
      if (Date.now() >= deadline) {
        subtask.status = "failed";
        subtask.error = "Orchestration timeout exceeded";
        continue;
      }

      // Wait if we're at the concurrency limit
      while (executing.length >= maxConcurrency) {
        await Promise.race(executing);
      }

      const promise = runSubtask(subtask).then(() => {
        const idx = executing.indexOf(promise);
        if (idx >= 0) executing.splice(idx, 1);
      });
      executing.push(promise);
    }

    // Wait for all remaining
    await Promise.allSettled(executing);
  }

  private async executeChatRelay(
    subtask: OrchestratorSubTask,
    relayOpts: ChatRelayOptions,
  ): Promise<ChatRelayResult> {
    return relayChatMessage(subtask.prompt, relayOpts);
  }

  private async executeToolInvoke(
    subtask: OrchestratorSubTask,
    toolInvoke: ToolInvokeFunction,
  ) {
    const { tool, action, args } = subtask.toolInvocation!;
    return toolInvoke(tool, action, args);
  }

  // ── Step 3: Synthesis ──

  private async synthesizeResults(
    plan: OrchestratorPlan,
  ): Promise<{ text: string; method: "llm" | "concatenation" }> {
    const completed = plan.subtasks.filter((s) => s.status === "completed");
    const failed = plan.subtasks.filter((s) => s.status === "failed");

    // Single subtask — just return the reply directly
    if (plan.subtasks.length === 1) {
      const s = plan.subtasks[0]!;
      if (s.status === "completed" && s.result?.reply) {
        return { text: s.result.reply, method: "concatenation" };
      }
      return {
        text: `❌ Failed: ${s.error ?? "No response from agent"}`,
        method: "concatenation",
      };
    }

    // Try LLM synthesis for multi-subtask results
    if (this.config.useLlmSynthesis && this.llm && completed.length > 0) {
      try {
        const synthesisInput = plan.subtasks.map((s) => ({
          description: s.description,
          reply: s.result?.reply ?? "",
          status: s.status,
        }));
        const synthesized = await this.llm.synthesize(plan.originalMessage, synthesisInput);
        if (synthesized) {
          const failNote = failed.length > 0
            ? `\n\n_⚠️ ${failed.length} subtask${failed.length > 1 ? "s" : ""} failed: ${failed.map((f) => f.description).join(", ")}_`
            : "";
          return { text: synthesized + failNote, method: "llm" };
        }
      } catch (err) {
        console.warn("[orchestrator] LLM synthesis failed:", err);
      }
    }

    // Fallback: concatenation
    return { text: this.concatenateResults(plan), method: "concatenation" };
  }

  private concatenateResults(plan: OrchestratorPlan): string {
    const parts: string[] = [];

    for (let i = 0; i < plan.subtasks.length; i++) {
      const s = plan.subtasks[i]!;
      if (s.status === "completed" && s.result?.reply) {
        if (plan.subtasks.length > 1) {
          parts.push(`**[${i + 1}] ${s.description}**\n\n${s.result.reply}`);
        } else {
          parts.push(s.result.reply);
        }
      } else {
        parts.push(`**[${i + 1}] ${s.description}** — ❌ ${s.error ?? "Failed"}`);
      }
    }

    return parts.join("\n\n---\n\n");
  }
}

// ─── Utility ──────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
