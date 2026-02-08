/**
 * OpenClaw API Client
 *
 * All fetch calls to /openclaw/* endpoints.
 * Uses x-workspace-id and x-actor-role headers for context.
 */

import type { ApiResponse } from "@ethoxford/contracts";
import { apiBaseUrl } from "./api-client";

const DEFAULT_WORKSPACE = "ethoxford-ws";
const DEFAULT_ROLE = "operator";

async function ocRaw<T>(
  path: string,
  opts?: { method?: string; body?: unknown; workspaceId?: string; role?: string },
): Promise<ApiResponse<T>> {
  const init: RequestInit = {
    method: opts?.method ?? "GET",
    headers: {
      "content-type": "application/json",
      "x-workspace-id": opts?.workspaceId ?? DEFAULT_WORKSPACE,
      "x-actor-role": opts?.role ?? DEFAULT_ROLE,
    },
    cache: "no-store",
  };
  if (opts?.body != null) {
    init.body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${apiBaseUrl()}/openclaw${path}`, init);
  return (await res.json()) as ApiResponse<T>;
}

/** Convenience: unwrap ApiResponse to T | null */
async function oc<T>(
  path: string,
  opts?: { method?: string; body?: unknown; workspaceId?: string; role?: string },
): Promise<T | null> {
  const r = await ocRaw<T>(path, opts);
  return r.ok ? r.data : null;
}

// ── Gateways ──

export interface GatewayRecord {
  gatewayId: string;
  environment: string;
  host: string;
  port: number;
  authMode: string;
  tokenRef: string;
  status: string;
  basePath: string;
  loopbackOnly: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function listGateways() {
  return oc<{ gateways: GatewayRecord[] }>("/gateways");
}

export async function registerGateway(body: {
  environment: string;
  host: string;
  port: number;
  authMode: string;
  tokenRef: string;
  basePath?: string;
  loopbackOnly?: boolean;
}) {
  return oc<GatewayRecord>("/gateways", { method: "POST", body });
}

export async function updateGatewayHealth(body: {
  gatewayId: string;
  status: string;
  error?: string;
}) {
  return oc<GatewayRecord>("/gateways/health", { method: "POST", body });
}

// ── Bindings ──

export interface BindingRecord {
  bindingId: string;
  workspaceId: string;
  gatewayId: string;
  defaultSessionKey: string;
  agentIdPrefix: string;
  createdAt: string;
}

export async function listBindings() {
  return oc<{ bindings: BindingRecord[] }>("/bindings");
}

export async function createBinding(body: { workspaceId: string; gatewayId: string }) {
  return oc<BindingRecord>("/bindings", { method: "POST", body });
}

// ── Tool Catalog ──

export interface ToolCatalogEntry {
  toolName: string;
  gatewayId: string;
  riskTier: number;
  approvalRequired: string;
  allowedActions: string[];
  description?: string;
  reviewStatus: string;
  createdAt: string;
}

export async function listTools() {
  return oc<{ tools: ToolCatalogEntry[] }>("/tools/catalog");
}

export async function registerTool(body: {
  toolName: string;
  gatewayId: string;
  riskTier: number;
  description?: string;
  approvalRequired?: string;
}) {
  return oc<ToolCatalogEntry>("/tools/catalog", { method: "POST", body });
}

export async function quarantineTool(body: { toolName: string; gatewayId: string }) {
  return oc<ToolCatalogEntry>("/tools/quarantine", { method: "POST", body });
}

// ── Policy ──

export interface PolicyRule {
  ruleId: string;
  workspaceId: string;
  role: string;
  toolName: string;
  action: string;
  decision: string;
  ruleVersion: number;
  createdAt: string;
}

export async function listPolicyRules() {
  return oc<{ rules: PolicyRule[] }>("/policy/rules");
}

export async function addPolicyRule(body: {
  role: string;
  toolName: string;
  decision: string;
  workspaceId?: string;
}) {
  return oc<PolicyRule>("/policy/rules", { method: "POST", body });
}

export async function evaluatePolicy(body: { toolName: string; action?: string }) {
  return oc<{ decision: string; matchedRuleId?: string }>("/policy/evaluate", {
    method: "POST",
    body,
  });
}

// ── Tool Invoke ──

export interface InvokeEnvelope {
  invocationId: string;
  workspaceId: string;
  gatewayId: string;
  request: { tool: string; action?: string; args?: Record<string, unknown> };
  policyDecision: string;
  riskTier: number;
  status: string;
  httpStatus?: number;
  durationMs?: number;
  responseSummary?: string;
  startedAt: string;
  completedAt?: string;
  traceId: string;
  spanId: string;
}

export async function invokeTool(body: {
  tool: string;
  action?: string;
  args?: Record<string, unknown>;
  sessionKey?: string;
}) {
  return oc<{ invocation: InvokeEnvelope }>("/tools/invoke", { method: "POST", body });
}

// ── Chat (natural language → OpenClaw agent via WebSocket relay) ──

export interface ChatReply {
  reply: string;
  fragments: string[];
  durationMs: number;
}

export async function chatWithAgent(message: string, sessionKey?: string) {
  return oc<ChatReply>("/chat", {
    method: "POST",
    body: { message, ...(sessionKey ? { sessionKey } : {}) },
  });
}

// ── Capability Discovery ──

export interface DiscoveredCapability {
  name: string;
  category: "tool" | "integration";
  icon: string;
  description: string;
  status: "available";
}

export interface CapabilitiesResponse {
  capabilities: DiscoveredCapability[];
  cached: boolean;
  fetchedAt: string;
}

export async function discoverCapabilities() {
  return oc<CapabilitiesResponse>("/capabilities");
}

export async function listInvocations() {
  return oc<{ invocations: InvokeEnvelope[] }>("/invocations");
}

// ── Audit ──

export interface AuditEntry {
  auditId: string;
  eventType: string;
  workspaceId: string;
  correlationId: string;
  traceId: string;
  resource: string;
  action: string;
  decision: string;
  riskTier: number;
  details: Record<string, unknown>;
  timestamp: string;
}

export async function listAudit() {
  return oc<{ audit: AuditEntry[] }>("/audit");
}

// ── Metrics ──

export interface MetricsSummary {
  workspaceId: string;
  generatedAt: string;
  totalInvocations: number;
  allowedInvocations: number;
  deniedInvocations: number;
  failedInvocations: number;
  pendingApprovals: number;
  activeSwarmRuns: number;
  activeFanOut: number;
  avgDurationMs: number;
  byTool: Record<string, { count: number; denied: number; failed: number; avgMs: number }>;
  byRiskTier: Record<string, { count: number; denied: number }>;
  byAgent: Record<string, { count: number; tasks: number }>;
}

export async function getMetrics() {
  return oc<MetricsSummary>("/metrics");
}

// ── Swarm ──

export interface SwarmRun {
  swarmRunId: string;
  workspaceId: string;
  coordinatorAgentId: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  maxFanOut: number;
  currentFanOut: number;
  tasks: SwarmTask[];
  startedAt: string;
  completedAt?: string;
}

export interface SwarmTask {
  taskId: string;
  swarmRunId: string;
  agentId: string;
  agentRole: string;
  description: string;
  toolName?: string;
  status: string;
  dependsOn: string[];
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export async function listSwarmRuns() {
  return oc<{ runs: SwarmRun[] }>("/swarm/runs");
}

export async function createSwarmRun(body: {
  coordinatorAgentId: string;
  agents: Array<{ agentId: string; role: string }>;
  maxFanOut?: number;
}) {
  return oc<SwarmRun>("/swarm/runs", { method: "POST", body });
}

export async function addSwarmTask(body: {
  swarmRunId: string;
  agentId: string;
  agentRole: string;
  description: string;
  toolName?: string;
  dependsOn?: string[];
}) {
  return oc<SwarmTask>("/swarm/tasks", { method: "POST", body });
}

export async function startSwarm(swarmRunId: string) {
  return oc<SwarmRun>("/swarm/start", { method: "POST", body: { swarmRunId } });
}

export async function transitionSwarmTask(body: {
  swarmRunId: string;
  taskId: string;
  status: string;
  result?: unknown;
  errorMessage?: string;
}) {
  return oc<SwarmTask>("/swarm/tasks/transition", { method: "POST", body });
}

export async function cancelSwarm(swarmRunId: string) {
  return oc<SwarmRun>("/swarm/cancel", { method: "POST", body: { swarmRunId } });
}

// ── Kill Switch ──

export interface KillSwitchRecord {
  switchId: string;
  scope: string;
  targetId: string;
  reason: string;
  activatedBy: string;
  activatedAt: string;
  deactivatedAt?: string;
  active: boolean;
}

export async function listKillSwitches() {
  return oc<{ killSwitches: KillSwitchRecord[] }>("/killswitch");
}

export async function activateKillSwitch(body: {
  scope: string;
  targetId: string;
  reason: string;
}) {
  return oc<KillSwitchRecord>("/killswitch/activate", { method: "POST", body });
}

export async function deactivateKillSwitch(body: { scope: string; targetId: string }) {
  return oc<KillSwitchRecord>("/killswitch/deactivate", { method: "POST", body });
}
