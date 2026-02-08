/**
 * OpenClaw Route Handler
 *
 * HTTP route handling for all OpenClaw integration endpoints:
 * - Gateway management
 * - Workspace binding
 * - Tool catalog
 * - Policy management
 * - Tool invocation (through middleware chain)
 * - Swarm orchestration
 * - Kill switch
 * - Audit / metrics
 */

import { randomUUID } from "node:crypto";

import { relayChatMessage, type ChatRelayOptions } from "./openclaw-chat-relay.js";
import {
  OpenClawOrchestrator,
  type OrchestratorLlm,
  type ToolInvokeFunction,
  type OrchestratorConfig,
} from "./openclaw-orchestrator.js";

// ─── Capability Discovery Cache ────────────────────────────────
interface DiscoveredCapability {
  name: string;
  category: "tool" | "integration";
  icon: string;
  description: string;
  status: "available";
}
let capabilitiesCache: { data: DiscoveredCapability[]; fetchedAt: number } | null = null;
const CAPABILITIES_TTL_MS = 5 * 60 * 1000; // 5 min cache

import {
  apiSuccess,
  apiError,
  type ApiResponse,
  type OpenClawToolRiskTier,
  type SwarmAgentRole,
  type OpenClawPolicyDecision,
  type OpenClawGatewayAuthMode,
  type KillSwitchScope,
} from "@ethoxford/contracts";
import {
  DomainError,
  type RequestContext,
  type OpenClawGatewayRegistry,
  type OpenClawWorkspaceBindingService,
  type OpenClawToolCatalog,
  type OpenClawPolicyCompiler,
  type OpenClawKillSwitch,
  type OpenClawAuditTrail,
  type OpenClawInvocationStore,
  type OpenClawSwarmOrchestrator,
  type OpenClawMiddlewareChain,
  buildAgentProfile,
  summarizeOpenClawMetrics,
} from "@ethoxford/domain";

// ─── Dependencies ──────────────────────────────────────────────

export interface OpenClawDependencies {
  gatewayRegistry: OpenClawGatewayRegistry;
  bindingService: OpenClawWorkspaceBindingService;
  toolCatalog: OpenClawToolCatalog;
  policyCompiler: OpenClawPolicyCompiler;
  killSwitch: OpenClawKillSwitch;
  auditTrail: OpenClawAuditTrail;
  invocationStore: OpenClawInvocationStore;
  swarmOrchestrator: OpenClawSwarmOrchestrator;
  middlewareChain: OpenClawMiddlewareChain;
  /** Options for the WebSocket chat relay to the OpenClaw agent. */
  chatRelayOpts?: ChatRelayOptions;
  /** Orchestrator engine for intelligent task decomposition & execution */
  orchestrator?: OpenClawOrchestrator;
  /** LLM for decomposition and synthesis (injected from server config) */
  orchestratorLlm?: OrchestratorLlm;
  /** Orchestrator config overrides */
  orchestratorConfig?: Partial<OrchestratorConfig>;
}

// ─── Route Handler ─────────────────────────────────────────────

export interface OpenClawRouteResult {
  statusCode: number;
  payload: ApiResponse<unknown>;
}

export async function handleOpenClawRequest(
  method: string,
  path: string,
  body: string,
  context: RequestContext,
  deps: OpenClawDependencies,
): Promise<OpenClawRouteResult | null> {
  // Only handle /openclaw/* routes
  if (!path.startsWith("/openclaw/")) return null;

  const subPath = path.slice("/openclaw".length);

  try {
    // ── Gateway routes ──
    if (method === "POST" && subPath === "/gateways") {
      const input = parseJson(body);
      const gw = deps.gatewayRegistry.register({
        environment: requireString(input, "environment"),
        host: requireString(input, "host"),
        port: optionalNumber(input, "port"),
        authMode: requireString(input, "authMode") as OpenClawGatewayAuthMode,
        tokenRef: requireString(input, "tokenRef"),
        basePath: optionalString(input, "basePath"),
        loopbackOnly: optionalBoolean(input, "loopbackOnly"),
      });
      return ok(context, gw, 201);
    }

    if (method === "GET" && subPath === "/gateways") {
      const gateways = deps.gatewayRegistry.list();
      return ok(context, { gateways });
    }

    if (method === "POST" && subPath === "/gateways/health") {
      const input = parseJson(body);
      const gw = deps.gatewayRegistry.updateStatus(
        requireString(input, "gatewayId"),
        requireString(input, "status") as "online" | "degraded" | "offline",
        optionalString(input, "error"),
      );
      return ok(context, gw);
    }

    // ── Capability discovery (asks the OpenClaw agent what it can do) ──
    if (method === "GET" && subPath === "/capabilities") {
      // Return cache if fresh
      if (capabilitiesCache && Date.now() - capabilitiesCache.fetchedAt < CAPABILITIES_TTL_MS) {
        return ok(context, { capabilities: capabilitiesCache.data, cached: true, fetchedAt: new Date(capabilitiesCache.fetchedAt).toISOString() });
      }

      // Always resolve from gateway registry
      const gateways = deps.gatewayRegistry.list();
      const gw = gateways[0];
      if (!gw) {
        return { statusCode: 503, payload: apiError(context.correlationId, "unavailable", "No gateways registered — cannot discover capabilities") };
      }
      const relayOpts: ChatRelayOptions = {
        host: gw.host,
        port: gw.port,
        token: gw.tokenRef,
        sessionKey: "agent:main:main",
        timeoutMs: 45_000,
      };

      const prompt =
        'List ALL your tools and integrations. Reply ONLY with a JSON array, no markdown, no explanation. Each item must have: {"name":"...","category":"tool"|"integration","icon":"emoji","description":"short description"}. Include every capability you have: browser control, web fetch, command execution, file operations, cron, messaging, and all integrations like Google, Twitter/X, etc.';

      const result = await relayChatMessage(prompt, relayOpts);

      if (!result.ok) {
        return { statusCode: 502, payload: apiError(context.correlationId, "unavailable", result.error ?? "Failed to discover capabilities") };
      }

      // Parse the JSON array from the reply
      const capabilities = parseCapabilitiesReply(result.reply);
      capabilitiesCache = { data: capabilities, fetchedAt: Date.now() };
      return ok(context, { capabilities, cached: false, fetchedAt: new Date().toISOString() });
    }

    // ── Workspace binding routes ──
    if (method === "POST" && subPath === "/bindings") {
      const input = parseJson(body);
      const binding = deps.bindingService.bind({
        workspaceId: requireString(input, "workspaceId"),
        gatewayId: requireString(input, "gatewayId"),
        defaultSessionKey: optionalString(input, "defaultSessionKey"),
        agentIdPrefix: optionalString(input, "agentIdPrefix"),
      });
      return ok(context, binding, 201);
    }

    if (method === "GET" && subPath === "/bindings") {
      const bindings = deps.bindingService.list();
      return ok(context, { bindings });
    }

    // ── Tool catalog routes ──
    if (method === "POST" && subPath === "/tools/catalog") {
      const input = parseJson(body);
      const entry = deps.toolCatalog.register({
        toolName: requireString(input, "toolName"),
        gatewayId: requireString(input, "gatewayId"),
        riskTier: requireNumber(input, "riskTier") as OpenClawToolRiskTier,
        approvalRequired: optionalString(input, "approvalRequired") as "none" | "user_confirm" | "admin" | "break_glass" | undefined,
        allowedActions: optionalStringArray(input, "allowedActions"),
        toolGroup: optionalString(input, "toolGroup"),
        description: optionalString(input, "description"),
        allowedWorkspaces: optionalStringArray(input, "allowedWorkspaces"),
        allowedRoles: optionalStringArray(input, "allowedRoles"),
      });
      return ok(context, entry, 201);
    }

    if (method === "GET" && subPath === "/tools/catalog") {
      const entries = deps.toolCatalog.listAll();
      return ok(context, { tools: entries });
    }

    if (method === "POST" && subPath === "/tools/quarantine") {
      const input = parseJson(body);
      const entry = deps.toolCatalog.quarantine(
        requireString(input, "toolName"),
        requireString(input, "gatewayId"),
      );
      return ok(context, entry);
    }

    // ── Policy routes ──
    if (method === "POST" && subPath === "/policy/rules") {
      const input = parseJson(body);
      const rule = deps.policyCompiler.addRule({
        workspaceId: context.workspaceId ?? requireString(input, "workspaceId"),
        role: requireString(input, "role"),
        toolName: requireString(input, "toolName"),
        action: optionalString(input, "action"),
        decision: requireString(input, "decision") as OpenClawPolicyDecision,
      });
      return ok(context, rule, 201);
    }

    if (method === "GET" && subPath === "/policy/rules") {
      const rules = deps.policyCompiler.listRules(context.workspaceId);
      return ok(context, { rules });
    }

    if (method === "POST" && subPath === "/policy/compile") {
      const input = parseJson(body);
      const compiled = deps.policyCompiler.compile({
        workspaceId: context.workspaceId ?? requireString(input, "workspaceId"),
        gatewayId: requireString(input, "gatewayId"),
        agentId: requireString(input, "agentId"),
        catalog: deps.toolCatalog,
      });
      return ok(context, compiled);
    }

    if (method === "POST" && subPath === "/policy/evaluate") {
      const input = parseJson(body);
      const result = deps.policyCompiler.evaluate({
        workspaceId: context.workspaceId ?? requireString(input, "workspaceId"),
        roles: context.roles,
        toolName: requireString(input, "toolName"),
        action: optionalString(input, "action") ?? "*",
      });
      return ok(context, result);
    }

    // ── Tool invocation (through middleware chain) ──
    if (method === "POST" && subPath === "/tools/invoke") {
      const input = parseJson(body);
      const invokeRequest: import("@ethoxford/contracts").OpenClawInvokeRequest = {
        tool: requireString(input, "tool"),
        ...(optionalString(input, "action") ? { action: optionalString(input, "action")! } : {}),
        ...(optionalObject(input, "args") ? { args: optionalObject(input, "args")! } : {}),
        ...(optionalString(input, "sessionKey") ? { sessionKey: optionalString(input, "sessionKey")! } : {}),
      };
      const invokeOpts: { swarmRunId?: string; agentRunId?: string; confirmHighRisk?: boolean | undefined } = {};
      if (optionalString(input, "swarmRunId")) invokeOpts.swarmRunId = optionalString(input, "swarmRunId")!;
      if (optionalString(input, "agentRunId")) invokeOpts.agentRunId = optionalString(input, "agentRunId")!;
      if (optionalBoolean(input, "confirmHighRisk") !== undefined) invokeOpts.confirmHighRisk = optionalBoolean(input, "confirmHighRisk");
      const result = await deps.middlewareChain.execute(context, invokeRequest, invokeOpts);

      if (result.blocked) {
        return { statusCode: 403, payload: apiError(context.correlationId, "policy_denied", result.reason, { invocationId: result.envelope.invocationId }) };
      }
      if (result.requiresApproval) {
        return { statusCode: 202, payload: apiSuccess(context.correlationId, { status: "awaiting_approval", invocationId: result.envelope.invocationId, riskTier: result.envelope.riskTier, approvalRequired: result.envelope.approvalRequired }) };
      }
      return ok(context, { invocation: result.envelope });
    }

    // ── Chat relay (natural-language → OpenClaw agent via WebSocket) ──
    if (method === "POST" && subPath === "/chat") {
      const input = parseJson(body);
      const message = requireString(input, "message");
      const sessionKey = optionalString(input, "sessionKey");

      // Always rebuild relay opts from gateway registry to avoid stale cache
      const gateways = deps.gatewayRegistry.list();
      const gw = gateways[0];
      if (!gw) {
        return { statusCode: 503, payload: apiError(context.correlationId, "unavailable", "No gateways registered") };
      }
      const relayOpts: ChatRelayOptions = {
        host: gw.host,
        port: gw.port,
        token: gw.tokenRef,
        sessionKey: sessionKey ?? "agent:main:main",
        timeoutMs: 60_000,
      };
      console.log(`[chat] Relaying to ws://${relayOpts.host}:${relayOpts.port} token=${relayOpts.token.substring(0,8)}...`);

      const result = await relayChatMessage(message, relayOpts);
      if (!result.ok) {
        return { statusCode: 502, payload: apiError(context.correlationId, "unavailable", result.error ?? "Chat relay failed", { durationMs: result.durationMs }) };
      }
      return ok(context, {
        reply: result.reply,
        fragments: result.fragments,
        durationMs: result.durationMs,
      });
    }

    // ── Task orchestrator (decompose → concurrent execution → synthesis) ──
    // Primary endpoint for the frontend. Uses the Orchestrator engine:
    //   1. LLM-powered decomposition (falls back to heuristics)
    //   2. Concurrent execution via chat relay + tool invocations
    //   3. Automatic retry with exponential backoff on failures
    //   4. LLM-powered synthesis of multi-subtask results
    if (method === "POST" && subPath === "/task") {
      const input = parseJson(body);
      const message = requireString(input, "message");
      const sessionKey = optionalString(input, "sessionKey");

      const gateways = deps.gatewayRegistry.list();
      const gw = gateways[0];
      if (!gw) {
        return { statusCode: 503, payload: apiError(context.correlationId, "unavailable", "No gateways registered — cannot relay task") };
      }
      const relayOpts: ChatRelayOptions = {
        host: gw.host,
        port: gw.port,
        token: gw.tokenRef,
        sessionKey: sessionKey ?? "agent:main:main",
        timeoutMs: 60_000,
      };

      // Build the tool invoke function that goes through the full middleware chain
      const toolInvoke: ToolInvokeFunction = async (tool, action, args) => {
        try {
          const invokeRequest: import("@ethoxford/contracts").OpenClawInvokeRequest = {
            tool,
            ...(action ? { action } : {}),
            ...(args ? { args } : {}),
          };
          const mwResult = await deps.middlewareChain.execute(context, invokeRequest, {});
          return {
            ok: !mwResult.blocked && !mwResult.requiresApproval,
            status: mwResult.envelope.status,
            httpStatus: mwResult.envelope.httpStatus,
            responseSummary: mwResult.envelope.responseSummary,
            error: mwResult.blocked ? mwResult.reason : undefined,
            durationMs: mwResult.envelope.durationMs,
          };
        } catch (err) {
          return {
            ok: false,
            status: "failed",
            error: err instanceof Error ? err.message : String(err),
          };
        }
      };

      // Use the orchestrator if available, fall back to the old decomposer
      const orchestrator = deps.orchestrator ?? new OpenClawOrchestrator(
        deps.orchestratorConfig,
        deps.orchestratorLlm ?? null,
      );

      console.log(`[task] Orchestrating to ws://${relayOpts.host}:${relayOpts.port} (LLM=${!!deps.orchestratorLlm})`);

      const result = await orchestrator.execute(message, relayOpts, toolInvoke);
      return ok(context, {
        reply: result.aggregatedReply,
        subtasks: result.subtasks.map((s) => ({
          id: s.id,
          type: s.type,
          description: s.description,
          status: s.status,
          attempts: s.attempts,
          durationMs: s.durationMs,
          error: s.error,
          replyPreview: s.replyPreview,
        })),
        strategy: result.strategy,
        decompositionMethod: result.decompositionMethod,
        synthesisMethod: result.synthesisMethod,
        totalDurationMs: result.totalDurationMs,
        completedCount: result.completedCount,
        failedCount: result.failedCount,
      });
    }

    // ── Connections overview (all integrations to OpenClaw) ──
    // Shows gateways, bindings, capabilities, and system status in one call.
    if (method === "GET" && subPath === "/connections") {
      const gateways = deps.gatewayRegistry.list();
      const bindings = deps.bindingService.list();
      const tools = deps.toolCatalog.listAll();
      const policies = deps.policyCompiler.listRules(context.workspaceId);
      const killSwitches = deps.killSwitch.listActive();

      // Try to get live capabilities from cache (don't block on discovery)
      const cachedCapabilities = capabilitiesCache
        ? { capabilities: capabilitiesCache.data, fetchedAt: new Date(capabilitiesCache.fetchedAt).toISOString() }
        : null;

      return ok(context, {
        gateways: gateways.map((gw) => ({
          gatewayId: gw.gatewayId,
          environment: gw.environment,
          host: gw.host,
          port: gw.port,
          authMode: gw.authMode,
          status: gw.status,
          basePath: gw.basePath,
          loopbackOnly: gw.loopbackOnly,
          createdAt: gw.createdAt,
        })),
        bindings: bindings.map((b) => ({
          bindingId: b.bindingId,
          workspaceId: b.workspaceId,
          gatewayId: b.gatewayId,
          defaultSessionKey: b.defaultSessionKey,
        })),
        toolCatalog: tools.map((t) => ({
          toolName: t.toolName,
          riskTier: t.riskTier,
          approvalRequired: t.approvalRequired,
          reviewStatus: t.reviewStatus,
        })),
        policyRules: policies.length,
        killSwitchesActive: killSwitches.length,
        discoveredCapabilities: cachedCapabilities,
        status: {
          gatewaysOnline: gateways.filter((g) => g.status === "online" || g.status === "degraded").length,
          gatewaysTotal: gateways.length,
          workspacesBound: bindings.length,
          killSwitchesActive: killSwitches.length,
          healthy: gateways.length > 0 && gateways.some((g) => g.status === "online") && killSwitches.length === 0,
        },
      });
    }

    // ── Invocation history ──
    if (method === "GET" && subPath === "/invocations") {
      const invocations = context.workspaceId
        ? deps.invocationStore.listByWorkspace(context.workspaceId)
        : [];
      return ok(context, { invocations });
    }

    // ── Swarm orchestration routes ──
    if (method === "POST" && subPath === "/swarm/runs") {
      const input = parseJson(body);
      const profileInputs = requireArray(input, "agents") as Array<{
        agentId: string;
        role: string;
        customAllow?: string[];
        customDeny?: string[];
        allowSpawnTargets?: string[];
      }>;

      const profiles = profileInputs.map((p) =>
        buildAgentProfile({
          agentId: p.agentId,
          role: p.role as SwarmAgentRole,
          workspaceId: context.workspaceId ?? "",
          customAllow: p.customAllow,
          customDeny: p.customDeny,
          allowSpawnTargets: p.allowSpawnTargets,
        }),
      );

      const run = deps.swarmOrchestrator.createRun({
        workspaceId: context.workspaceId ?? requireString(input, "workspaceId"),
        correlationId: context.correlationId,
        actorId: context.actorId,
        coordinatorAgentId: requireString(input, "coordinatorAgentId"),
        agentProfiles: profiles,
        maxFanOut: optionalNumber(input, "maxFanOut"),
      });
      return ok(context, run, 201);
    }

    if (method === "GET" && subPath === "/swarm/runs") {
      const runs = deps.swarmOrchestrator.listRuns(context.workspaceId);
      return ok(context, { runs });
    }

    if (method === "POST" && subPath === "/swarm/tasks") {
      const input = parseJson(body);
      const task = deps.swarmOrchestrator.addTask(
        requireString(input, "swarmRunId"),
        {
          agentId: requireString(input, "agentId"),
          agentRole: requireString(input, "agentRole") as SwarmAgentRole,
          description: requireString(input, "description"),
          toolName: optionalString(input, "toolName"),
          parentTaskId: optionalString(input, "parentTaskId"),
          dependsOn: optionalStringArray(input, "dependsOn"),
        },
      );
      return ok(context, task, 201);
    }

    if (method === "POST" && subPath === "/swarm/start") {
      const input = parseJson(body);
      const run = deps.swarmOrchestrator.start(requireString(input, "swarmRunId"));
      return ok(context, run);
    }

    if (method === "POST" && subPath === "/swarm/tasks/transition") {
      const input = parseJson(body);
      const transitionDetails: Record<string, unknown> = {};
      if (optionalString(input, "subAgentRunId")) transitionDetails.subAgentRunId = optionalString(input, "subAgentRunId");
      if (optionalString(input, "subAgentSessionKey")) transitionDetails.subAgentSessionKey = optionalString(input, "subAgentSessionKey");
      if (optionalString(input, "invocationId")) transitionDetails.invocationId = optionalString(input, "invocationId");
      if ((input as Record<string, unknown>).result !== undefined) transitionDetails.result = (input as Record<string, unknown>).result;
      if (optionalString(input, "errorMessage")) transitionDetails.errorMessage = optionalString(input, "errorMessage");
      const task = deps.swarmOrchestrator.transitionTask(
        requireString(input, "swarmRunId"),
        requireString(input, "taskId"),
        requireString(input, "status") as "running" | "blocked" | "completed" | "failed" | "canceled",
        transitionDetails as { subAgentRunId?: string; subAgentSessionKey?: string; invocationId?: string; result?: unknown; errorMessage?: string },
      );
      return ok(context, task);
    }

    if (method === "GET" && subPath === "/swarm/next-tasks") {
      const input = parseJson(body || "{}");
      const swarmRunId = optionalString(input, "swarmRunId");
      if (!swarmRunId) {
        return { statusCode: 400, payload: apiError(context.correlationId, "validation_denied", "swarmRunId is required") };
      }
      const tasks = deps.swarmOrchestrator.getNextRunnableTasks(swarmRunId);
      return ok(context, { tasks });
    }

    if (method === "POST" && subPath === "/swarm/cancel") {
      const input = parseJson(body);
      const run = deps.swarmOrchestrator.cancelRun(requireString(input, "swarmRunId"));
      return ok(context, run);
    }

    // ── Kill switch routes ──
    if (method === "POST" && subPath === "/killswitch/activate") {
      const input = parseJson(body);
      const record = deps.killSwitch.activate({
        scope: requireString(input, "scope") as KillSwitchScope,
        targetId: requireString(input, "targetId"),
        reason: requireString(input, "reason"),
        activatedBy: context.actorId ?? "system",
      });
      return ok(context, record, 201);
    }

    if (method === "POST" && subPath === "/killswitch/deactivate") {
      const input = parseJson(body);
      const record = deps.killSwitch.deactivate(
        requireString(input, "scope") as KillSwitchScope,
        requireString(input, "targetId"),
      );
      return ok(context, record);
    }

    if (method === "GET" && subPath === "/killswitch") {
      const active = deps.killSwitch.listActive();
      return ok(context, { killSwitches: active });
    }

    // ── Audit routes ──
    if (method === "GET" && subPath === "/audit") {
      const filter: { workspaceId?: string | undefined } = {};
      if (context.workspaceId) filter.workspaceId = context.workspaceId;
      const entries = deps.auditTrail.list(filter);
      return ok(context, { audit: entries });
    }

    // ── Metrics ──
    if (method === "GET" && subPath === "/metrics") {
      if (!context.workspaceId) {
        return { statusCode: 400, payload: apiError(context.correlationId, "validation_denied", "workspaceId required") };
      }
      const invocations = deps.invocationStore.listByWorkspace(context.workspaceId);
      const runs = deps.swarmOrchestrator.listRuns(context.workspaceId);
      const metrics = summarizeOpenClawMetrics(invocations, runs, context.workspaceId);
      return ok(context, metrics);
    }

    return null;
  } catch (error: unknown) {
    if (error instanceof DomainError) {
      return {
        statusCode: mapErrorToStatus(error.code),
        payload: apiError(context.correlationId, error.code, error.message, error.details),
      };
    }
    throw error;
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function ok(context: RequestContext, data: unknown, statusCode = 200): OpenClawRouteResult {
  return { statusCode, payload: apiSuccess(context.correlationId, data) };
}

function parseJson(body: string): Record<string, unknown> {
  if (!body.trim()) return {};
  try {
    const parsed = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new DomainError("validation_denied", "Request body must be a JSON object", { field: "body" });
    }
    return parsed as Record<string, unknown>;
  } catch (error: unknown) {
    if (error instanceof DomainError) throw error;
    throw new DomainError("validation_denied", "Invalid JSON in request body", { field: "body" });
  }
}

function requireString(obj: Record<string, unknown>, field: string): string {
  const value = obj[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new DomainError("validation_denied", `${field} is required`, { field });
  }
  return value;
}

function optionalString(obj: Record<string, unknown>, field: string): string | undefined {
  const value = obj[field];
  return typeof value === "string" ? value : undefined;
}

function requireNumber(obj: Record<string, unknown>, field: string): number {
  const value = obj[field];
  if (typeof value !== "number") {
    throw new DomainError("validation_denied", `${field} must be a number`, { field });
  }
  return value;
}

function optionalNumber(obj: Record<string, unknown>, field: string): number | undefined {
  const value = obj[field];
  return typeof value === "number" ? value : undefined;
}

function optionalBoolean(obj: Record<string, unknown>, field: string): boolean | undefined {
  const value = obj[field];
  return typeof value === "boolean" ? value : undefined;
}

function optionalObject(obj: Record<string, unknown>, field: string): Record<string, unknown> | undefined {
  const value = obj[field];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function requireArray(obj: Record<string, unknown>, field: string): unknown[] {
  const value = obj[field];
  if (!Array.isArray(value)) {
    throw new DomainError("validation_denied", `${field} must be an array`, { field });
  }
  return value;
}

function optionalStringArray(obj: Record<string, unknown>, field: string): string[] | undefined {
  const value = obj[field];
  if (!Array.isArray(value)) return undefined;
  return value.filter((v): v is string => typeof v === "string");
}

function mapErrorToStatus(code: string): number {
  switch (code) {
    case "validation_denied": return 400;
    case "auth_denied": return 401;
    case "policy_denied": return 403;
    case "not_found": return 404;
    case "conflict": return 409;
    case "rate_limited": return 429;
    case "unavailable": return 503;
    default: return 500;
  }
}

// ─── Capability Discovery Parser ──────────────────────────────

const ICON_MAP: Record<string, string> = {
  browser: "🌐", web: "🔗", command: "⚡", file: "📁", cron: "⏰",
  messaging: "💬", google: "🔍", gmail: "📧", calendar: "📅",
  drive: "💾", docs: "📄", sheets: "📊", twitter: "🐦", x: "🐦",
  slack: "💬", github: "🐙", discord: "🎮", notion: "📝",
  linear: "📐", jira: "🎫",
};

function guessIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return "🔌";
}

interface ParsedCapability {
  name: string;
  category: "tool" | "integration";
  icon: string;
  description: string;
  status: "available";
}

function parseCapabilitiesReply(reply: string): ParsedCapability[] {
  // Try to extract a JSON array from the reply
  try {
    // First try direct parse
    const parsed = JSON.parse(reply);
    if (Array.isArray(parsed)) return normalizeCapabilities(parsed);
  } catch { /* fallback */ }

  // Try to find JSON array in the text
  const jsonMatch = reply.match(/\[[\s\S]*?\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) return normalizeCapabilities(parsed);
    } catch { /* fallback */ }
  }

  // Fallback: parse markdown bullet-point list
  const capabilities: ParsedCapability[] = [];
  const lines = reply.split("\n");

  for (const line of lines) {
    const trimmed = line.replace(/^[\s\-*]+/, "").trim();
    if (!trimmed || trimmed.length < 3) continue;

    // Match "**Name** (description)" or "**Name:** description" patterns
    const boldMatch = trimmed.match(/\*\*([^*]+)\*\*[:\s]*(?:\(([^)]+)\)|(.+))?/);
    if (boldMatch) {
      const rawName = boldMatch[1]!.trim();
      const desc = (boldMatch[2] || boldMatch[3] || "").trim();
      const isTool = /control|execution|fetch|file|cron|message|command|browser/i.test(rawName + " " + desc);
      capabilities.push({
        name: rawName,
        category: isTool ? "tool" : "integration",
        icon: guessIcon(rawName),
        description: desc || rawName,
        status: "available",
      });
    }
  }

  return capabilities;
}

function normalizeCapabilities(arr: unknown[]): ParsedCapability[] {
  return arr
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      name: String(item.name ?? item.tool ?? item.integration ?? "Unknown"),
      category: (item.category === "integration" ? "integration" : "tool") as "tool" | "integration",
      icon: typeof item.icon === "string" && item.icon.length <= 4 ? item.icon : guessIcon(String(item.name ?? "")),
      description: String(item.description ?? item.desc ?? ""),
      status: "available" as const,
    }));
}
