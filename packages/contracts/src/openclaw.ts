/**
 * OpenClaw Integration Contracts
 *
 * Type definitions for the OpenClaw-backed swarm architecture,
 * zero-trust middleware, gateway management, tool catalog,
 * policy compilation, and agentic orchestration.
 */

// ─── Gateway Registry ──────────────────────────────────────────

export type OpenClawGatewayStatus = "online" | "degraded" | "offline" | "revoked";
export type OpenClawGatewayAuthMode = "bearer" | "token" | "password" | "none";

export interface OpenClawGatewayRecord {
  gatewayId: string;
  environment: string;
  host: string;
  port: number;
  authMode: OpenClawGatewayAuthMode;
  tokenRef: string;
  status: OpenClawGatewayStatus;
  basePath: string;
  loopbackOnly: boolean;
  createdAt: string;
  updatedAt: string;
  lastHealthCheckAt?: string | undefined;
  lastHealthError?: string | undefined;
}

export interface OpenClawWorkspaceBinding {
  bindingId: string;
  workspaceId: string;
  gatewayId: string;
  defaultSessionKey: string;
  agentIdPrefix: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Tool Catalog ──────────────────────────────────────────────

export type OpenClawToolRiskTier = 0 | 1 | 2 | 3;
export type OpenClawToolApproval = "none" | "user_confirm" | "admin" | "break_glass";

export interface OpenClawToolCatalogEntry {
  toolName: string;
  gatewayId: string;
  riskTier: OpenClawToolRiskTier;
  approvalRequired: OpenClawToolApproval;
  allowedActions: string[];
  toolGroup?: string | undefined;
  description?: string | undefined;
  allowedWorkspaces: string[];
  allowedRoles: string[];
  reviewStatus: "pending" | "approved" | "rejected" | "quarantined";
  pinnedRef?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

// ─── Policy ────────────────────────────────────────────────────

export type OpenClawPolicyDecision = "allow" | "deny";

export interface OpenClawPolicyRule {
  ruleId: string;
  workspaceId: string;
  role: string;
  toolName: string;
  action: string;
  decision: OpenClawPolicyDecision;
  ruleVersion: number;
  createdAt: string;
}

export interface OpenClawCompiledPolicy {
  workspaceId: string;
  gatewayId: string;
  agentId: string;
  toolsAllow: string[];
  toolsDeny: string[];
  toolGroups: string[];
  compiledAt: string;
  policyVersion: number;
}

// ─── Tool Invocation ───────────────────────────────────────────

export type OpenClawInvokeStatus =
  | "pending"
  | "policy_allowed"
  | "policy_denied"
  | "awaiting_approval"
  | "approved"
  | "executing"
  | "succeeded"
  | "failed"
  | "timed_out"
  | "canceled";

export interface OpenClawInvokeRequest {
  tool: string;
  action?: string | undefined;
  args?: Record<string, unknown> | undefined;
  sessionKey?: string | undefined;
  dryRun?: boolean | undefined;
}

export interface OpenClawInvokeEnvelope {
  invocationId: string;
  workspaceId: string;
  agentRunId?: string | undefined;
  swarmRunId?: string | undefined;
  actorId?: string | undefined;
  correlationId: string;
  gatewayId: string;
  request: OpenClawInvokeRequest;
  policyDecision: OpenClawPolicyDecision;
  policyRuleId?: string | undefined;
  riskTier: OpenClawToolRiskTier;
  approvalRequired: OpenClawToolApproval;
  status: OpenClawInvokeStatus;
  httpStatus?: number | undefined;
  responseHash?: string | undefined;
  responseSummary?: string | undefined;
  argsRedacted: Record<string, unknown>;
  startedAt: string;
  completedAt?: string | undefined;
  durationMs?: number | undefined;
  errorMessage?: string | undefined;
  traceId: string;
  spanId: string;
}

// ─── Swarm Orchestration ───────────────────────────────────────

export type SwarmRunStatus =
  | "planning"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "canceled";

export type SwarmTaskStatus =
  | "queued"
  | "running"
  | "blocked"
  | "completed"
  | "failed"
  | "canceled";

export type SwarmAgentRole =
  | "coordinator"
  | "researcher"
  | "executor"
  | "reviewer"
  | "custom";

export interface SwarmAgentProfile {
  agentId: string;
  role: SwarmAgentRole;
  sessionKey: string;
  toolsAllow: string[];
  toolsDeny: string[];
  toolGroups: string[];
  sandboxMode: "off" | "non-main" | "all";
  maxConcurrentTasks: number;
  allowedSpawnTargets: string[];
}

export interface SwarmTaskNode {
  taskId: string;
  swarmRunId: string;
  parentTaskId?: string | undefined;
  agentId: string;
  agentRole: SwarmAgentRole;
  description: string;
  toolName?: string | undefined;
  status: SwarmTaskStatus;
  subAgentRunId?: string | undefined;
  subAgentSessionKey?: string | undefined;
  invocationId?: string | undefined;
  dependsOn: string[];
  retryCount: number;
  maxRetries: number;
  startedAt?: string | undefined;
  completedAt?: string | undefined;
  errorMessage?: string | undefined;
  result?: unknown;
}

export interface SwarmRunRecord {
  swarmRunId: string;
  workspaceId: string;
  correlationId: string;
  actorId?: string | undefined;
  coordinatorAgentId: string;
  status: SwarmRunStatus;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  maxFanOut: number;
  currentFanOut: number;
  tasks: SwarmTaskNode[];
  agentProfiles: SwarmAgentProfile[];
  startedAt: string;
  completedAt?: string | undefined;
  errorMessage?: string | undefined;
  traceId: string;
}

// ─── Kill Switch ───────────────────────────────────────────────

export type KillSwitchScope = "gateway" | "tool" | "skill" | "agent";

export interface KillSwitchRecord {
  switchId: string;
  scope: KillSwitchScope;
  targetId: string;
  reason: string;
  activatedBy: string;
  activatedAt: string;
  deactivatedAt?: string | undefined;
  active: boolean;
}

// ─── Audit / Observability ─────────────────────────────────────

export interface OpenClawAuditEntry {
  auditId: string;
  eventType: string;
  workspaceId: string;
  actorId?: string | undefined;
  correlationId: string;
  traceId: string;
  spanId: string;
  resource: string;
  action: string;
  decision: OpenClawPolicyDecision;
  riskTier: OpenClawToolRiskTier;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface OpenClawMetricsSummary {
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

// ─── OpenClaw Tool Group Constants ─────────────────────────────

export const OPENCLAW_TOOL_GROUPS: Record<string, string[]> = {
  "group:runtime": ["exec", "bash", "process"],
  "group:fs": ["read", "write", "edit", "apply_patch"],
  "group:sessions": [
    "sessions_list",
    "sessions_history",
    "sessions_send",
    "sessions_spawn",
    "session_status",
  ],
  "group:memory": ["memory_search", "memory_get"],
  "group:web": ["web_search", "web_fetch"],
  "group:ui": ["browser", "canvas"],
  "group:automation": ["cron", "gateway"],
  "group:messaging": ["message"],
  "group:nodes": ["nodes"],
};

export const DEFAULT_SUBAGENT_TOOL_DENY: string[] = [
  "sessions_list",
  "sessions_history",
  "sessions_send",
  "sessions_spawn",
  "gateway",
  "agents_list",
  "whatsapp_login",
  "session_status",
  "cron",
  "memory_search",
  "memory_get",
];

// ─── Swarm Transition Maps ────────────────────────────────────

export const SWARM_RUN_TRANSITIONS: Record<SwarmRunStatus, readonly SwarmRunStatus[]> = {
  planning: ["running", "failed", "canceled"],
  running: ["paused", "completed", "failed", "canceled"],
  paused: ["running", "canceled"],
  completed: [],
  failed: [],
  canceled: [],
};

export const SWARM_TASK_TRANSITIONS: Record<SwarmTaskStatus, readonly SwarmTaskStatus[]> = {
  queued: ["running", "canceled"],
  running: ["blocked", "completed", "failed", "canceled"],
  blocked: ["running", "failed", "canceled"],
  completed: [],
  failed: ["queued"],
  canceled: [],
};

export function isValidSwarmRunTransition(
  from: SwarmRunStatus,
  to: SwarmRunStatus,
): boolean {
  return SWARM_RUN_TRANSITIONS[from].includes(to);
}

export function isValidSwarmTaskTransition(
  from: SwarmTaskStatus,
  to: SwarmTaskStatus,
): boolean {
  return SWARM_TASK_TRANSITIONS[from].includes(to);
}
