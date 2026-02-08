/**
 * OpenClaw Gateway Client
 *
 * Uses the HTTP /tools/invoke endpoint for tool invocations.
 * The OpenClaw gateway exposes POST /tools/invoke on the same port as
 * the WebSocket control-plane.  Auth is via Authorization: Bearer <token>.
 *
 * Request body: { tool, action?, args?, sessionKey? }
 * Response:     { ok: true, result } | { ok: false, error }
 *
 * @see https://github.com/ArcadeAI/OpenClaw/blob/main/docs/gateway/tools-invoke-http-api.md
 */

import type { OpenClawGatewayClient } from "@ethoxford/domain";
import type { OpenClawInvokeRequest, OpenClawGatewayAuthMode } from "@ethoxford/contracts";

/** Timeout for the HTTP request. */
const HTTP_TIMEOUT_MS = 30_000;

/**
 * Invokes OpenClaw tools via the HTTP /tools/invoke endpoint.
 * This is the correct endpoint for direct tool invocation — the WebSocket
 * `agent` method is for chat messages, NOT tool calls.
 */
export class HttpToolsInvokeClient implements OpenClawGatewayClient {
  /** If true, use https:// instead of http://. */
  private useTls: boolean;

  constructor(opts?: { tls?: boolean }) {
    this.useTls = opts?.tls ?? false;
  }

  async invoke(
    gatewayHost: string,
    gatewayPort: number,
    authToken: string,
    authMode: OpenClawGatewayAuthMode,
    basePath: string,
    request: OpenClawInvokeRequest,
  ): Promise<{ httpStatus: number; body: unknown }> {
    const protocol = this.useTls ? "https" : "http";
    const base = (basePath || "").replace(/\/+$/, "");
    const url = `${protocol}://${gatewayHost}:${gatewayPort}${base}/tools/invoke`;

    // Build the request body per the /tools/invoke API spec
    const invokeBody: Record<string, unknown> = {
      tool: request.tool,
    };
    if (request.action) {
      invokeBody.action = request.action;
    }
    if (request.args && Object.keys(request.args).length > 0) {
      invokeBody.args = request.args;
    }
    if (request.sessionKey) {
      invokeBody.sessionKey = request.sessionKey;
    }

    // Auth: Bearer token for both "token" and "bearer" modes;
    // for "password" mode, the gateway also accepts the password as a Bearer token.
    const bearerValue = authMode === "password"
      ? (authToken.includes(":") ? authToken.split(":")[1] : authToken)
      : authToken;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${bearerValue}`,
        },
        body: JSON.stringify(invokeBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      let responseBody: unknown;
      const responseText = await response.text();
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = { raw: responseText.slice(0, 500) };
      }
      return { httpStatus: response.status, body: responseBody };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { httpStatus: 504, body: { error: "Gateway HTTP timeout" } };
      }
      return {
        httpStatus: 502,
        body: { error: `Gateway HTTP error: ${err instanceof Error ? err.message : String(err)}` },
      };
    }
  }
}

/**
 * In-memory mock gateway client for testing/demo.
 * Simulates OpenClaw behavior: returns 404 for non-allowlisted tools.
 */
export class InMemoryOpenClawGatewayClient implements OpenClawGatewayClient {
  private readonly allowedTools = new Set<string>();
  private readonly toolResponses = new Map<string, unknown>();

  allowTool(toolName: string, response?: unknown): void {
    this.allowedTools.add(toolName);
    if (response !== undefined) {
      this.toolResponses.set(toolName, response);
    }
  }

  denyTool(toolName: string): void {
    this.allowedTools.delete(toolName);
  }

  async invoke(
    _gatewayHost: string,
    _gatewayPort: number,
    _authToken: string,
    _authMode: OpenClawGatewayAuthMode,
    _basePath: string,
    request: OpenClawInvokeRequest,
  ): Promise<{ httpStatus: number; body: unknown }> {
    // Simulate OpenClaw 404 for non-allowlisted tools
    if (!this.allowedTools.has(request.tool)) {
      return {
        httpStatus: 404,
        body: {
          ok: false,
          error: { type: "not_found", message: `Tool not available: ${request.tool}` },
        },
      };
    }

    const customResponse = this.toolResponses.get(request.tool);
    return {
      httpStatus: 200,
      body: {
        ok: true,
        result: customResponse ?? {
          tool: request.tool,
          action: request.action,
          executed: true,
          timestamp: new Date().toISOString(),
        },
      },
    };
  }
}
