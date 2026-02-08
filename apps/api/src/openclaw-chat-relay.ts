/**
 * OpenClaw Chat Relay
 *
 * Opens a short-lived WebSocket connection to the OpenClaw gateway,
 * sends a user message via the `agent` method, collects the streamed
 * response fragments, and returns the full agent reply.
 *
 * This is the correct way to interact conversationally with the OpenClaw
 * agent — the HTTP `/tools/invoke` endpoint is for direct tool calls only.
 */

import WebSocket from "ws";
import { randomUUID } from "node:crypto";

export interface ChatRelayOptions {
  /** Gateway WebSocket host (e.g. "100.111.98.27") */
  host: string;
  /** Gateway WebSocket port (e.g. 18790) */
  port: number;
  /** Bearer token for auth */
  token: string;
  /** Session key (e.g. "agent:main:main") */
  sessionKey?: string;
  /** Timeout in ms (default 60s) */
  timeoutMs?: number;
}

export interface ChatRelayResult {
  ok: boolean;
  reply: string;
  fragments: string[];
  error?: string;
  durationMs: number;
}

/**
 * Send a natural-language message to the OpenClaw agent via WebSocket
 * and collect the full response.
 */
export async function relayChatMessage(
  message: string,
  opts: ChatRelayOptions,
): Promise<ChatRelayResult> {
  const start = Date.now();
  const timeout = opts.timeoutMs ?? 60_000;
  const sessionKey = opts.sessionKey ?? "agent:main:main";

  return new Promise<ChatRelayResult>((resolve) => {
    const wsUrl = `ws://${opts.host}:${opts.port}`;
    const ws = new WebSocket(wsUrl);
    const connectId = `c-${randomUUID().slice(0, 8)}`;
    const agentId = `a-${randomUUID().slice(0, 8)}`;
    const fragments: string[] = [];
    let settled = false;

    const finish = (result: ChatRelayResult) => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch { /* ignore */ }
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({
        ok: false,
        reply: "",
        fragments,
        error: "Timeout waiting for agent response",
        durationMs: Date.now() - start,
      });
    }, timeout);

    ws.on("open", () => {
      console.log(`[chat-relay] WS open to ${wsUrl}, sending connect handshake...`);
      // Step 1: Send connect handshake
      ws.send(JSON.stringify({
        type: "req",
        id: connectId,
        method: "connect",
        params: {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: "gateway-client",
            displayName: "EthOxford Middleware",
            version: "0.1.0",
            platform: process.platform,
            mode: "backend",
          },
          role: "operator",
          scopes: ["operator.admin"],
          caps: [],
          auth: { token: opts.token },
        },
      }));
    });

    ws.on("message", (data) => {
      try {
        const frame = JSON.parse(String(data));

        // Handle connect response
        if (frame.type === "res" && frame.id === connectId) {
          if (!frame.ok) {
            clearTimeout(timer);
            finish({
              ok: false,
              reply: "",
              fragments,
              error: `Connect failed: ${frame.error?.message ?? "unknown"}`,
              durationMs: Date.now() - start,
            });
            return;
          }

          // Step 2: Connected! Send agent message
          ws.send(JSON.stringify({
            type: "req",
            id: agentId,
            method: "agent",
            params: {
              sessionKey,
              message,
              idempotencyKey: `idem-${randomUUID()}`,
            },
          }));
          return;
        }

        // Handle agent final response
        if (frame.type === "res" && frame.id === agentId) {
          // OpenClaw sends an initial "accepted" ack — skip it
          const status = frame.payload?.status;
          if (status === "accepted" || status === "queued") {
            return;
          }

          clearTimeout(timer);
          let finalReply = "";

          if (frame.ok) {
            // The authoritative full text is in payload.result.payloads[].text
            const payloadResult = frame.payload?.result ?? frame.result;
            if (payloadResult?.payloads && Array.isArray(payloadResult.payloads)) {
              finalReply = payloadResult.payloads
                .map((p: { text?: string }) => typeof p.text === "string" ? p.text : "")
                .filter(Boolean)
                .join("");
            }
            if (!finalReply) {
              finalReply = extractText(frame.result) || extractText(frame.payload) || "";
            }
          }

          finish({
            ok: frame.ok ?? false,
            reply: finalReply || fragments.join(""),
            fragments: finalReply ? [finalReply] : fragments,
            error: frame.ok ? undefined : (frame.error?.message ?? "Agent error"),
            durationMs: Date.now() - start,
          });
          return;
        }

        // Capture streaming deltas from agent events
        if (frame.type === "event" && frame.event === "agent") {
          if (frame.payload?.stream === "assistant" && typeof frame.payload?.data?.delta === "string") {
            fragments.push(frame.payload.data.delta);
          }
        }

        // Capture final chat event as authoritative fallback
        if (frame.type === "event" && frame.event === "chat" && frame.payload?.state === "final") {
          const content = frame.payload?.message?.content;
          if (Array.isArray(content)) {
            const fullText = content
              .map((c: unknown) => typeof c === "string" ? c : (c as { text?: string })?.text ?? "")
              .filter(Boolean)
              .join("");
            if (fullText) {
              fragments.length = 0;
              fragments.push(fullText);
            }
          }
        }

        // Handle stream fragments
        if (frame.type === "stream" || frame.method === "stream") {
          const text = extractText(frame.params) || extractText(frame.data) || "";
          if (text) fragments.push(text);
        }
      } catch {
        // Ignore parse errors on individual frames
      }
    });

    ws.on("error", (err) => {
      console.log(`[chat-relay] WS error: ${err.message}`);
      clearTimeout(timer);
      finish({
        ok: false,
        reply: "",
        fragments,
        error: `WebSocket error: ${err.message}`,
        durationMs: Date.now() - start,
      });
    });

    ws.on("close", (code, reason) => {
      console.log(`[chat-relay] WS closed code=${code} reason=${String(reason)} fragments=${fragments.length} settled=${settled}`);
      clearTimeout(timer);
      if (!settled) {
        finish({
          ok: fragments.length > 0,
          reply: fragments.join(""),
          fragments,
          error: fragments.length > 0 ? undefined : "Connection closed before response",
          durationMs: Date.now() - start,
        });
      }
    });
  });
}

/** Recursively extract text content from an object */
function extractText(obj: unknown): string {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  if (typeof obj !== "object") return String(obj);

  const o = obj as Record<string, unknown>;

  // Direct text fields
  if (typeof o.text === "string") return o.text;
  if (typeof o.message === "string") return o.message;
  if (typeof o.content === "string") return o.content;
  if (typeof o.reply === "string") return o.reply;
  if (typeof o.output === "string") return o.output;

  // Content array (OpenClaw format)
  if (Array.isArray(o.content)) {
    return o.content
      .map((c: unknown) => {
        if (typeof c === "string") return c;
        if (c && typeof c === "object" && "text" in (c as Record<string, unknown>)) {
          return (c as Record<string, unknown>).text;
        }
        return "";
      })
      .filter(Boolean)
      .join("");
  }

  // Nested result
  if (o.result) return extractText(o.result);

  return "";
}
