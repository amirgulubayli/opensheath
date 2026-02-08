/**
 * OpenClaw Domain — Gateway Registry, Tool Catalog, Policy Compiler,
 * Swarm Orchestrator, Kill Switch, Audit Trail, and Middleware Chain.
 *
 * This is the "beating heart" — every tool invocation flows through
 * the middleware chain before reaching OpenClaw `/tools/invoke`.
 */

import { randomUUID } from "node:crypto";

import {
  DEFAULT_SUBAGENT_TOOL_DENY,
  OPENCLAW_TOOL_GROUPS,
  isValidSwarmRunTransition,
  isValidSwarmTaskTransition,
  type KillSwitchRecord,
  type KillSwitchScope,
  type OpenClawAuditEntry,
  type OpenClawCompiledPolicy,
  type OpenClawGatewayAuthMode,
  type OpenClawGatewayRecord,
  type OpenClawGatewayStatus,
  type OpenClawInvokeEnvelope,
  type OpenClawInvokeRequest,
  type OpenClawInvokeStatus,
  type OpenClawMetricsSummary,
  type OpenClawPolicyDecision,
  type OpenClawPolicyRule,
  type OpenClawToolApproval,
  type OpenClawToolCatalogEntry,
  type OpenClawToolRiskTier,
  type OpenClawWorkspaceBinding,
  type SwarmAgentProfile,
  type SwarmAgentRole,
  type SwarmRunRecord,
  type SwarmRunStatus,
  type SwarmTaskNode,
  type SwarmTaskStatus,
} from "@ethoxford/contracts";

import { DomainError, type RequestContext } from "./shared.js";

// ═══════════════════════════════════════════════════════════════
// 1) GATEWAY REGISTRY
// ═══════════════════════════════════════════════════════════════

export class OpenClawGatewayRegistry {
  private readonly gateways = new Map<string, OpenClawGatewayRecord>();

  register(input: {
    environment: string;
    host: string;
    port?: number | undefined;
    authMode: OpenClawGatewayAuthMode;
    tokenRef: string;
    basePath?: string | undefined;
    loopbackOnly?: boolean | undefined;
  }): OpenClawGatewayRecord {
    if (!input.host.trim()) {
      throw new DomainError("validation_denied", "Gateway host is required", { field: "host" });
    }
    const now = new Date().toISOString();
    const gw: OpenClawGatewayRecord = {
      gatewayId: `gw_${randomUUID()}`,
      environment: input.environment,
      host: input.host,
      port: input.port ?? 18789,
      authMode: input.authMode,
      tokenRef: input.tokenRef,
      status: "online",
      basePath: input.basePath ?? "",
      loopbackOnly: input.loopbackOnly ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.gateways.set(gw.gatewayId, gw);
    return gw;
  }

  get(gatewayId: string): OpenClawGatewayRecord {
    const gw = this.gateways.get(gatewayId);
    if (!gw) throw new DomainError("not_found", "Gateway not found", { gatewayId });
    return gw;
  }

  updateStatus(gatewayId: string, status: OpenClawGatewayStatus, error?: string): OpenClawGatewayRecord {
    const gw = this.get(gatewayId);
    const updated: OpenClawGatewayRecord = {
      ...gw,
      status,
      updatedAt: new Date().toISOString(),
      lastHealthCheckAt: new Date().toISOString(),
      ...(error ? { lastHealthError: error } : {}),
    };
    this.gateways.set(gatewayId, updated);
    return updated;
  }

  list(environment?: string): OpenClawGatewayRecord[] {
    const all = [...this.gateways.values()];
    return environment ? all.filter((g) => g.environment === environment) : all;
  }

  revoke(gatewayId: string, reason: string): OpenClawGatewayRecord {
    return this.updateStatus(gatewayId, "revoked", reason);
  }
}

// ═══════════════════════════════════════════════════════════════
// 2) WORKSPACE BINDING
// ═══════════════════════════════════════════════════════════════

export class OpenClawWorkspaceBindingService {
  private readonly bindings = new Map<string, OpenClawWorkspaceBinding>();

  bind(input: {
    workspaceId: string;
    gatewayId: string;
    defaultSessionKey?: string | undefined;
    agentIdPrefix?: string | undefined;
  }): OpenClawWorkspaceBinding {
    if (!input.workspaceId.trim()) {
      throw new DomainError("validation_denied", "workspaceId is required", { field: "workspaceId" });
    }
    const now = new Date().toISOString();
    const binding: OpenClawWorkspaceBinding = {
      bindingId: `bind_${randomUUID()}`,
      workspaceId: input.workspaceId,
      gatewayId: input.gatewayId,
      defaultSessionKey: input.defaultSessionKey ?? "main",
      agentIdPrefix: input.agentIdPrefix ?? input.workspaceId,
      createdAt: now,
      updatedAt: now,
    };
    this.bindings.set(input.workspaceId, binding);
    return binding;
  }

  getForWorkspace(workspaceId: string): OpenClawWorkspaceBinding {
    const binding = this.bindings.get(workspaceId);
    if (!binding) {
      throw new DomainError("not_found", "No OpenClaw binding for workspace", { workspaceId });
    }
    return binding;
  }

  list(): OpenClawWorkspaceBinding[] {
    return [...this.bindings.values()];
  }
}

// ═══════════════════════════════════════════════════════════════
// 3) TOOL CATALOG
// ═══════════════════════════════════════════════════════════════

export class OpenClawToolCatalog {
  private readonly tools = new Map<string, OpenClawToolCatalogEntry>();

  register(input: {
    toolName: string;
    gatewayId: string;
    riskTier: OpenClawToolRiskTier;
    approvalRequired?: OpenClawToolApproval | undefined;
    allowedActions?: string[] | undefined;
    toolGroup?: string | undefined;
    description?: string | undefined;
    allowedWorkspaces?: string[] | undefined;
    allowedRoles?: string[] | undefined;
  }): OpenClawToolCatalogEntry {
    if (!input.toolName.trim()) {
      throw new DomainError("validation_denied", "Tool name is required", { field: "toolName" });
    }
    const now = new Date().toISOString();
    const entry: OpenClawToolCatalogEntry = {
      toolName: input.toolName,
      gatewayId: input.gatewayId,
      riskTier: input.riskTier,
      approvalRequired: input.approvalRequired ?? (input.riskTier >= 2 ? "user_confirm" : "none"),
      allowedActions: input.allowedActions ?? ["*"],
      toolGroup: input.toolGroup,
      description: input.description,
      allowedWorkspaces: input.allowedWorkspaces ?? ["*"],
      allowedRoles: input.allowedRoles ?? ["owner", "admin", "member"],
      reviewStatus: "approved",
      pinnedRef: undefined,
      createdAt: now,
      updatedAt: now,
    };
    this.tools.set(this.key(input.toolName, input.gatewayId), entry);
    return entry;
  }

  get(toolName: string, gatewayId: string): OpenClawToolCatalogEntry | undefined {
    // Exact match first, then fall back to wildcard "*" entry for the gateway
    return this.tools.get(this.key(toolName, gatewayId))
      ?? this.tools.get(this.key("*", gatewayId));
  }

  listByGateway(gatewayId: string): OpenClawToolCatalogEntry[] {
    return [...this.tools.values()].filter((t) => t.gatewayId === gatewayId);
  }

  listAll(): OpenClawToolCatalogEntry[] {
    return [...this.tools.values()];
  }

  quarantine(toolName: string, gatewayId: string): OpenClawToolCatalogEntry {
    const entry = this.get(toolName, gatewayId);
    if (!entry) {
      throw new DomainError("not_found", "Tool not found in catalog", { toolName, gatewayId });
    }
    const updated: OpenClawToolCatalogEntry = {
      ...entry,
      reviewStatus: "quarantined",
      updatedAt: new Date().toISOString(),
    };
    this.tools.set(this.key(toolName, gatewayId), updated);
    return updated;
  }

  private key(toolName: string, gatewayId: string): string {
    return `${gatewayId}:${toolName}`;
  }
}

// ═══════════════════════════════════════════════════════════════
// 4) POLICY COMPILER (Two-Layer)
// ═══════════════════════════════════════════════════════════════

export class OpenClawPolicyCompiler {
  private readonly rules: OpenClawPolicyRule[] = [];
  private readonly compiledPolicies = new Map<string, OpenClawCompiledPolicy>();

  addRule(input: {
    workspaceId: string;
    role: string;
    toolName: string;
    action?: string | undefined;
    decision: OpenClawPolicyDecision;
  }): OpenClawPolicyRule {
    const rule: OpenClawPolicyRule = {
      ruleId: `rule_${randomUUID()}`,
      workspaceId: input.workspaceId,
      role: input.role,
      toolName: input.toolName,
      action: input.action ?? "*",
      decision: input.decision,
      ruleVersion: this.rules.filter((r) => r.workspaceId === input.workspaceId).length + 1,
      createdAt: new Date().toISOString(),
    };
    this.rules.push(rule);
    return rule;
  }

  /**
   * Evaluate middleware policy: deny wins.
   * Returns "allow" only if no deny rules match AND at least one allow matches.
   */
  evaluate(input: {
    workspaceId: string;
    roles: string[];
    toolName: string;
    action: string;
  }): { decision: OpenClawPolicyDecision; matchedRuleId?: string } {
    const workspaceRules = this.rules.filter((r) => r.workspaceId === input.workspaceId);

    // Check deny first (deny always wins — matches OpenClaw behavior)
    for (const rule of workspaceRules) {
      if (rule.decision !== "deny") continue;
      if (!this.matchesTool(rule, input.toolName, input.action)) continue;
      if (!input.roles.includes(rule.role) && rule.role !== "*") continue;
      return { decision: "deny", matchedRuleId: rule.ruleId };
    }

    // Check allow
    for (const rule of workspaceRules) {
      if (rule.decision !== "allow") continue;
      if (!this.matchesTool(rule, input.toolName, input.action)) continue;
      if (!input.roles.includes(rule.role) && rule.role !== "*") continue;
      return { decision: "allow", matchedRuleId: rule.ruleId };
    }

    // Deny by default
    return { decision: "deny" };
  }

  /**
   * Compile full OpenClaw policy config for a workspace + agent.
   * Generates the tools.allow/deny arrays for OpenClaw config.
   */
  compile(input: {
    workspaceId: string;
    gatewayId: string;
    agentId: string;
    catalog: OpenClawToolCatalog;
  }): OpenClawCompiledPolicy {
    const catalogEntries = input.catalog.listByGateway(input.gatewayId);
    const workspaceRules = this.rules.filter((r) => r.workspaceId === input.workspaceId);

    const allow: string[] = [];
    const deny: string[] = [];
    const groupsUsed = new Set<string>();

    for (const entry of catalogEntries) {
      if (entry.reviewStatus === "quarantined" || entry.reviewStatus === "rejected") {
        deny.push(entry.toolName);
        continue;
      }
      // Check for explicit deny rules
      const isDenied = workspaceRules.some(
        (r) => r.decision === "deny" && this.matchesTool(r, entry.toolName, "*"),
      );
      if (isDenied) {
        deny.push(entry.toolName);
      } else {
        allow.push(entry.toolName);
      }
      if (entry.toolGroup) groupsUsed.add(entry.toolGroup);
    }

    const compiled: OpenClawCompiledPolicy = {
      workspaceId: input.workspaceId,
      gatewayId: input.gatewayId,
      agentId: input.agentId,
      toolsAllow: allow,
      toolsDeny: deny,
      toolGroups: [...groupsUsed],
      compiledAt: new Date().toISOString(),
      policyVersion: workspaceRules.length,
    };
    this.compiledPolicies.set(`${input.workspaceId}:${input.agentId}`, compiled);
    return compiled;
  }

  listRules(workspaceId?: string): OpenClawPolicyRule[] {
    return workspaceId ? this.rules.filter((r) => r.workspaceId === workspaceId) : [...this.rules];
  }

  private matchesTool(rule: OpenClawPolicyRule, toolName: string, action: string): boolean {
    const toolMatch = rule.toolName === "*" || rule.toolName === toolName;
    const actionMatch = rule.action === "*" || rule.action === action;
    return toolMatch && actionMatch;
  }
}

// ═══════════════════════════════════════════════════════════════
// 5) TOOL GROUP EXPANSION
// ═══════════════════════════════════════════════════════════════

export function expandToolGroups(entries: string[]): string[] {
  const result: string[] = [];
  for (const entry of entries) {
    const group = OPENCLAW_TOOL_GROUPS[entry];
    if (group) {
      result.push(...group);
    } else {
      result.push(entry);
    }
  }
  return [...new Set(result)];
}

// ═══════════════════════════════════════════════════════════════
// 6) KILL SWITCH
// ═══════════════════════════════════════════════════════════════

export class OpenClawKillSwitch {
  private readonly switches = new Map<string, KillSwitchRecord>();

  activate(input: {
    scope: KillSwitchScope;
    targetId: string;
    reason: string;
    activatedBy: string;
  }): KillSwitchRecord {
    const key = `${input.scope}:${input.targetId}`;
    const record: KillSwitchRecord = {
      switchId: `ks_${randomUUID()}`,
      scope: input.scope,
      targetId: input.targetId,
      reason: input.reason,
      activatedBy: input.activatedBy,
      activatedAt: new Date().toISOString(),
      active: true,
    };
    this.switches.set(key, record);
    return record;
  }

  deactivate(scope: KillSwitchScope, targetId: string): KillSwitchRecord {
    const key = `${scope}:${targetId}`;
    const record = this.switches.get(key);
    if (!record) throw new DomainError("not_found", "Kill switch not found", { scope, targetId });
    const deactivated: KillSwitchRecord = {
      ...record,
      active: false,
      deactivatedAt: new Date().toISOString(),
    };
    this.switches.set(key, deactivated);
    return deactivated;
  }

  isKilled(scope: KillSwitchScope, targetId: string): boolean {
    const key = `${scope}:${targetId}`;
    const record = this.switches.get(key);
    return record?.active === true;
  }

  listActive(): KillSwitchRecord[] {
    return [...this.switches.values()].filter((s) => s.active);
  }
}

// ═══════════════════════════════════════════════════════════════
// 7) AUDIT TRAIL
// ═══════════════════════════════════════════════════════════════

export class OpenClawAuditTrail {
  private readonly entries: OpenClawAuditEntry[] = [];

  record(input: Omit<OpenClawAuditEntry, "auditId" | "timestamp">): OpenClawAuditEntry {
    const entry: OpenClawAuditEntry = {
      auditId: `audit_${randomUUID()}`,
      ...input,
      timestamp: new Date().toISOString(),
    };
    this.entries.push(entry);
    return entry;
  }

  list(filter?: {
    workspaceId?: string | undefined;
    correlationId?: string | undefined;
    traceId?: string | undefined;
    eventType?: string | undefined;
  }): OpenClawAuditEntry[] {
    let result = [...this.entries];
    if (filter?.workspaceId) result = result.filter((e) => e.workspaceId === filter.workspaceId);
    if (filter?.correlationId) result = result.filter((e) => e.correlationId === filter.correlationId);
    if (filter?.traceId) result = result.filter((e) => e.traceId === filter.traceId);
    if (filter?.eventType) result = result.filter((e) => e.eventType === filter.eventType);
    return result;
  }
}

// ═══════════════════════════════════════════════════════════════
// 8) INVOCATION STORE
// ═══════════════════════════════════════════════════════════════

export class OpenClawInvocationStore {
  private readonly invocations = new Map<string, OpenClawInvokeEnvelope>();

  save(envelope: OpenClawInvokeEnvelope): void {
    this.invocations.set(envelope.invocationId, envelope);
  }

  get(invocationId: string): OpenClawInvokeEnvelope | undefined {
    return this.invocations.get(invocationId);
  }

  update(invocationId: string, patch: Partial<OpenClawInvokeEnvelope>): OpenClawInvokeEnvelope {
    const existing = this.invocations.get(invocationId);
    if (!existing) throw new DomainError("not_found", "Invocation not found", { invocationId });
    const updated = { ...existing, ...patch };
    this.invocations.set(invocationId, updated);
    return updated;
  }

  listByWorkspace(workspaceId: string): OpenClawInvokeEnvelope[] {
    return [...this.invocations.values()].filter((i) => i.workspaceId === workspaceId);
  }

  listBySwarmRun(swarmRunId: string): OpenClawInvokeEnvelope[] {
    return [...this.invocations.values()].filter((i) => i.swarmRunId === swarmRunId);
  }
}

// ═══════════════════════════════════════════════════════════════
// 9) SWARM ORCHESTRATOR (the crown jewel)
// ═══════════════════════════════════════════════════════════════

export class OpenClawSwarmOrchestrator {
  private readonly runs = new Map<string, SwarmRunRecord>();

  constructor(
    private readonly maxFanOutPerWorkspace: number = 8,
    private readonly maxTaskRetries: number = 2,
  ) {}

  /**
   * Create a new swarm run with a coordinator agent.
   */
  createRun(input: {
    workspaceId: string;
    correlationId: string;
    actorId?: string | undefined;
    coordinatorAgentId: string;
    agentProfiles: SwarmAgentProfile[];
    maxFanOut?: number | undefined;
  }): SwarmRunRecord {
    const traceId = `trace_${randomUUID()}`;
    const run: SwarmRunRecord = {
      swarmRunId: `swarm_${randomUUID()}`,
      workspaceId: input.workspaceId,
      correlationId: input.correlationId,
      actorId: input.actorId,
      coordinatorAgentId: input.coordinatorAgentId,
      status: "planning",
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      maxFanOut: Math.min(input.maxFanOut ?? this.maxFanOutPerWorkspace, this.maxFanOutPerWorkspace),
      currentFanOut: 0,
      tasks: [],
      agentProfiles: input.agentProfiles,
      startedAt: new Date().toISOString(),
      traceId,
    };
    this.runs.set(run.swarmRunId, run);
    return run;
  }

  /**
   * Add a task node to the swarm DAG.
   */
  addTask(swarmRunId: string, input: {
    agentId: string;
    agentRole: SwarmAgentRole;
    description: string;
    toolName?: string | undefined;
    parentTaskId?: string | undefined;
    dependsOn?: string[] | undefined;
  }): SwarmTaskNode {
    const run = this.requireRun(swarmRunId);
    const task: SwarmTaskNode = {
      taskId: `task_${randomUUID()}`,
      swarmRunId,
      parentTaskId: input.parentTaskId,
      agentId: input.agentId,
      agentRole: input.agentRole,
      description: input.description,
      toolName: input.toolName,
      status: "queued",
      dependsOn: input.dependsOn ?? [],
      retryCount: 0,
      maxRetries: this.maxTaskRetries,
    };
    run.tasks.push(task);
    run.totalTasks = run.tasks.length;
    this.runs.set(swarmRunId, run);
    return task;
  }

  /**
   * Start the swarm run — transition from planning to running.
   */
  start(swarmRunId: string): SwarmRunRecord {
    return this.transitionRun(swarmRunId, "running");
  }

  /**
   * Transition a task status within the swarm.
   */
  transitionTask(
    swarmRunId: string,
    taskId: string,
    nextStatus: SwarmTaskStatus,
    details?: {
      subAgentRunId?: string | undefined;
      subAgentSessionKey?: string | undefined;
      invocationId?: string | undefined;
      result?: unknown;
      errorMessage?: string | undefined;
    },
  ): SwarmTaskNode {
    const run = this.requireRun(swarmRunId);
    const taskIndex = run.tasks.findIndex((t) => t.taskId === taskId);
    if (taskIndex === -1) {
      throw new DomainError("not_found", "Task not found in swarm run", { taskId, swarmRunId });
    }

    const task = run.tasks[taskIndex]!;
    if (!isValidSwarmTaskTransition(task.status, nextStatus)) {
      throw new DomainError("conflict", "Invalid swarm task transition", {
        taskId,
        from: task.status,
        to: nextStatus,
      });
    }

    const now = new Date().toISOString();
    const updated: SwarmTaskNode = {
      ...task,
      status: nextStatus,
      ...(nextStatus === "running" ? { startedAt: now } : {}),
      ...(nextStatus === "completed" || nextStatus === "failed" || nextStatus === "canceled"
        ? { completedAt: now }
        : {}),
      ...(details?.subAgentRunId ? { subAgentRunId: details.subAgentRunId } : {}),
      ...(details?.subAgentSessionKey ? { subAgentSessionKey: details.subAgentSessionKey } : {}),
      ...(details?.invocationId ? { invocationId: details.invocationId } : {}),
      ...(details?.result !== undefined ? { result: details.result } : {}),
      ...(details?.errorMessage ? { errorMessage: details.errorMessage } : {}),
    };

    if (nextStatus === "failed") {
      updated.retryCount = task.retryCount + 1;
    }

    run.tasks[taskIndex] = updated;

    // Update counters
    run.completedTasks = run.tasks.filter((t) => t.status === "completed").length;
    run.failedTasks = run.tasks.filter((t) => t.status === "failed").length;
    run.currentFanOut = run.tasks.filter((t) => t.status === "running").length;

    // Auto-complete or auto-fail the swarm run
    const allDone = run.tasks.every(
      (t) => t.status === "completed" || t.status === "failed" || t.status === "canceled",
    );
    if (allDone && run.status === "running") {
      const anyFailed = run.tasks.some((t) => t.status === "failed");
      this.transitionRun(swarmRunId, anyFailed ? "failed" : "completed");
    }

    this.runs.set(swarmRunId, run);
    return updated;
  }

  /**
   * Get the next runnable tasks (dependencies satisfied, under fan-out cap).
   */
  getNextRunnableTasks(swarmRunId: string): SwarmTaskNode[] {
    const run = this.requireRun(swarmRunId);
    if (run.status !== "running") return [];

    const completedIds = new Set(
      run.tasks.filter((t) => t.status === "completed").map((t) => t.taskId),
    );
    const available = run.tasks.filter((t) => {
      if (t.status !== "queued") return false;
      return t.dependsOn.every((dep) => completedIds.has(dep));
    });

    const slots = run.maxFanOut - run.currentFanOut;
    return available.slice(0, Math.max(0, slots));
  }

  getRun(swarmRunId: string): SwarmRunRecord {
    return this.requireRun(swarmRunId);
  }

  listRuns(workspaceId?: string): SwarmRunRecord[] {
    const all = [...this.runs.values()];
    return workspaceId ? all.filter((r) => r.workspaceId === workspaceId) : all;
  }

  cancelRun(swarmRunId: string): SwarmRunRecord {
    const run = this.requireRun(swarmRunId);
    // Cancel all non-terminal tasks
    for (let i = 0; i < run.tasks.length; i++) {
      const task = run.tasks[i]!;
      if (task.status === "queued" || task.status === "running" || task.status === "blocked") {
        run.tasks[i] = { ...task, status: "canceled", completedAt: new Date().toISOString() };
      }
    }
    return this.transitionRun(swarmRunId, "canceled");
  }

  private transitionRun(swarmRunId: string, nextStatus: SwarmRunStatus): SwarmRunRecord {
    const run = this.requireRun(swarmRunId);
    if (!isValidSwarmRunTransition(run.status, nextStatus)) {
      throw new DomainError("conflict", "Invalid swarm run transition", {
        swarmRunId,
        from: run.status,
        to: nextStatus,
      });
    }
    const updated: SwarmRunRecord = {
      ...run,
      status: nextStatus,
      ...(nextStatus === "completed" || nextStatus === "failed" || nextStatus === "canceled"
        ? { completedAt: new Date().toISOString() }
        : {}),
    };
    this.runs.set(swarmRunId, updated);
    return updated;
  }

  private requireRun(swarmRunId: string): SwarmRunRecord {
    const run = this.runs.get(swarmRunId);
    if (!run) throw new DomainError("not_found", "Swarm run not found", { swarmRunId });
    return run;
  }
}

// ═══════════════════════════════════════════════════════════════
// 10) ZERO-TRUST MIDDLEWARE CHAIN
// ═══════════════════════════════════════════════════════════════

export interface OpenClawMiddlewareResult {
  decision: OpenClawPolicyDecision;
  envelope: OpenClawInvokeEnvelope;
  blocked: boolean;
  reason: string;
  requiresApproval: boolean;
}

export interface OpenClawGatewayClient {
  invoke(
    gatewayHost: string,
    gatewayPort: number,
    authToken: string,
    authMode: import("@ethoxford/contracts").OpenClawGatewayAuthMode,
    basePath: string,
    request: OpenClawInvokeRequest,
  ): Promise<{ httpStatus: number; body: unknown }>;
}

/**
 * The central middleware chain that:
 * 1. Resolves workspace → gateway binding
 * 2. Checks kill switches
 * 3. Evaluates middleware policy (deny-by-default)
 * 4. Checks tool catalog (risk tier, approval, review status)
 * 5. Creates the invocation envelope
 * 6. Calls OpenClaw /tools/invoke
 * 7. Records audit trail
 * 8. Returns result
 */
export class OpenClawMiddlewareChain {
  constructor(
    private readonly gatewayRegistry: OpenClawGatewayRegistry,
    private readonly bindingService: OpenClawWorkspaceBindingService,
    private readonly toolCatalog: OpenClawToolCatalog,
    private readonly policyCompiler: OpenClawPolicyCompiler,
    private readonly killSwitch: OpenClawKillSwitch,
    private readonly auditTrail: OpenClawAuditTrail,
    private readonly invocationStore: OpenClawInvocationStore,
    private readonly gatewayClient: OpenClawGatewayClient,
  ) {}

  async execute(
    context: RequestContext,
    request: OpenClawInvokeRequest,
    options?: {
      swarmRunId?: string | undefined;
      agentRunId?: string | undefined;
      confirmHighRisk?: boolean | undefined;
    },
  ): Promise<OpenClawMiddlewareResult> {
    const workspaceId = context.workspaceId;
    if (!workspaceId) {
      throw new DomainError("validation_denied", "workspaceId is required", { field: "workspaceId" });
    }

    const traceId = `trace_${randomUUID()}`;
    const spanId = `span_${randomUUID()}`;

    // 1. Resolve binding
    const binding = this.bindingService.getForWorkspace(workspaceId);
    const gateway = this.gatewayRegistry.get(binding.gatewayId);

    // 2. Check kill switches
    if (this.killSwitch.isKilled("gateway", gateway.gatewayId)) {
      return this.denied(context, request, traceId, spanId, "Gateway killed by operator", binding, options);
    }
    if (this.killSwitch.isKilled("tool", request.tool)) {
      return this.denied(context, request, traceId, spanId, "Tool killed by operator", binding, options);
    }

    // 3. Check gateway health
    if (gateway.status === "offline" || gateway.status === "revoked") {
      return this.denied(context, request, traceId, spanId, `Gateway is ${gateway.status}`, binding, options);
    }

    // 4. Check tool catalog
    const catalogEntry = this.toolCatalog.get(request.tool, gateway.gatewayId);
    const riskTier: OpenClawToolRiskTier = catalogEntry?.riskTier ?? 3;
    const approvalRequired: OpenClawToolApproval = catalogEntry?.approvalRequired ?? "admin";

    if (catalogEntry?.reviewStatus === "quarantined" || catalogEntry?.reviewStatus === "rejected") {
      return this.denied(context, request, traceId, spanId, `Tool is ${catalogEntry.reviewStatus}`, binding, options, riskTier, approvalRequired);
    }

    // 5. Evaluate middleware policy (deny-by-default)
    const policyResult = this.policyCompiler.evaluate({
      workspaceId,
      roles: context.roles,
      toolName: request.tool,
      action: request.action ?? "*",
    });

    if (policyResult.decision === "deny") {
      return this.denied(context, request, traceId, spanId, "Denied by middleware policy", binding, options, riskTier, approvalRequired, policyResult.matchedRuleId);
    }

    // 6. Check approval requirement
    if (riskTier >= 2 && approvalRequired !== "none" && !options?.confirmHighRisk) {
      const envelope = this.createEnvelope(context, request, binding, traceId, spanId, "allow", "awaiting_approval", riskTier, approvalRequired, policyResult.matchedRuleId, options);
      this.invocationStore.save(envelope);
      this.auditTrail.record({
        eventType: "tool_invoke.awaiting_approval",
        workspaceId,
        actorId: context.actorId,
        correlationId: context.correlationId,
        traceId,
        spanId,
        resource: request.tool,
        action: request.action ?? "*",
        decision: "allow",
        riskTier,
        details: { approvalRequired, toolName: request.tool },
      });
      return {
        decision: "allow",
        envelope,
        blocked: false,
        reason: "Awaiting approval for high-risk action",
        requiresApproval: true,
      };
    }

    // 7. Execute through OpenClaw
    const envelope = this.createEnvelope(context, request, binding, traceId, spanId, "allow", "executing", riskTier, approvalRequired, policyResult.matchedRuleId, options);
    this.invocationStore.save(envelope);

    try {
      const startMs = Date.now();
      const response = await this.gatewayClient.invoke(
        gateway.host,
        gateway.port,
        gateway.tokenRef,
        gateway.authMode,
        gateway.basePath,
        {
          ...request,
          sessionKey: request.sessionKey ?? binding.defaultSessionKey,
        },
      );
      const durationMs = Date.now() - startMs;

      const finalStatus: OpenClawInvokeStatus = response.httpStatus === 200 ? "succeeded"
        : response.httpStatus === 404 ? "policy_denied"
        : "failed";

      const completedEnvelope = this.invocationStore.update(envelope.invocationId, {
        status: finalStatus,
        httpStatus: response.httpStatus,
        completedAt: new Date().toISOString(),
        durationMs,
        responseSummary: typeof response.body === "string" ? response.body.slice(0, 500) : JSON.stringify(response.body).slice(0, 500),
        responseHash: `hash_${randomUUID().slice(0, 8)}`,
      });

      this.auditTrail.record({
        eventType: `tool_invoke.${finalStatus}`,
        workspaceId,
        actorId: context.actorId,
        correlationId: context.correlationId,
        traceId,
        spanId,
        resource: request.tool,
        action: request.action ?? "*",
        decision: finalStatus === "policy_denied" ? "deny" : "allow",
        riskTier,
        details: {
          toolName: request.tool,
          httpStatus: response.httpStatus,
          durationMs,
          gatewayId: gateway.gatewayId,
        },
      });

      return {
        decision: finalStatus === "policy_denied" ? "deny" : "allow",
        envelope: completedEnvelope,
        blocked: finalStatus === "policy_denied",
        reason: finalStatus === "policy_denied" ? "Blocked by OpenClaw policy chain (404)" : "Executed successfully",
        requiresApproval: false,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.invocationStore.update(envelope.invocationId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        errorMessage,
      });

      this.auditTrail.record({
        eventType: "tool_invoke.failed",
        workspaceId,
        actorId: context.actorId,
        correlationId: context.correlationId,
        traceId,
        spanId,
        resource: request.tool,
        action: request.action ?? "*",
        decision: "allow",
        riskTier,
        details: { toolName: request.tool, error: errorMessage },
      });

      throw new DomainError("unavailable", `OpenClaw invocation failed: ${errorMessage}`, {
        toolName: request.tool,
      });
    }
  }

  private denied(
    context: RequestContext,
    request: OpenClawInvokeRequest,
    traceId: string,
    spanId: string,
    reason: string,
    binding: OpenClawWorkspaceBinding,
    options?: { swarmRunId?: string | undefined; agentRunId?: string | undefined },
    riskTier: OpenClawToolRiskTier = 0,
    approvalRequired: OpenClawToolApproval = "none",
    matchedRuleId?: string | undefined,
  ): OpenClawMiddlewareResult {
    const workspaceId = context.workspaceId!;
    const envelope = this.createEnvelope(context, request, binding, traceId, spanId, "deny", "policy_denied", riskTier, approvalRequired, matchedRuleId, options);
    envelope.completedAt = new Date().toISOString();
    this.invocationStore.save(envelope);

    this.auditTrail.record({
      eventType: "tool_invoke.denied",
      workspaceId,
      actorId: context.actorId,
      correlationId: context.correlationId,
      traceId,
      spanId,
      resource: request.tool,
      action: request.action ?? "*",
      decision: "deny",
      riskTier,
      details: { toolName: request.tool, reason, matchedRuleId: matchedRuleId ?? "default_deny" },
    });

    return {
      decision: "deny",
      envelope,
      blocked: true,
      reason,
      requiresApproval: false,
    };
  }

  private createEnvelope(
    context: RequestContext,
    request: OpenClawInvokeRequest,
    binding: OpenClawWorkspaceBinding,
    traceId: string,
    spanId: string,
    decision: OpenClawPolicyDecision,
    status: OpenClawInvokeStatus,
    riskTier: OpenClawToolRiskTier,
    approvalRequired: OpenClawToolApproval,
    matchedRuleId?: string | undefined,
    options?: { swarmRunId?: string | undefined; agentRunId?: string | undefined },
  ): OpenClawInvokeEnvelope {
    return {
      invocationId: `inv_${randomUUID()}`,
      workspaceId: context.workspaceId!,
      agentRunId: options?.agentRunId,
      swarmRunId: options?.swarmRunId,
      actorId: context.actorId,
      correlationId: context.correlationId,
      gatewayId: binding.gatewayId,
      request,
      policyDecision: decision,
      policyRuleId: matchedRuleId,
      riskTier,
      approvalRequired,
      status,
      argsRedacted: this.redactSensitive(request.args ?? {}),
      startedAt: new Date().toISOString(),
      traceId,
      spanId,
    };
  }

  private redactSensitive(args: Record<string, unknown>): Record<string, unknown> {
    const sensitive = /password|secret|token|api[_-]?key|credential|ssn|credit[_-]?card/i;
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      redacted[key] = sensitive.test(key) ? "***REDACTED***" : value;
    }
    return redacted;
  }
}

// ═══════════════════════════════════════════════════════════════
// 11) METRICS AGGREGATOR
// ═══════════════════════════════════════════════════════════════

export function summarizeOpenClawMetrics(
  invocations: OpenClawInvokeEnvelope[],
  swarmRuns: SwarmRunRecord[],
  workspaceId: string,
): OpenClawMetricsSummary {
  const wsInv = invocations.filter((i) => i.workspaceId === workspaceId);

  const byTool: OpenClawMetricsSummary["byTool"] = {};
  const byRiskTier: OpenClawMetricsSummary["byRiskTier"] = {};
  const byAgent: OpenClawMetricsSummary["byAgent"] = {};

  let totalDuration = 0;
  let durationCount = 0;
  let allowed = 0;
  let denied = 0;
  let failed = 0;
  let pending = 0;

  for (const inv of wsInv) {
    // By tool
    const tb = byTool[inv.request.tool] ?? { count: 0, denied: 0, failed: 0, avgMs: 0 };
    tb.count++;
    if (inv.status === "policy_denied") { tb.denied++; denied++; }
    else if (inv.status === "failed" || inv.status === "timed_out") { tb.failed++; failed++; }
    else if (inv.status === "awaiting_approval" || inv.status === "pending") { pending++; }
    else if (inv.status === "succeeded") { allowed++; }
    if (inv.durationMs) { totalDuration += inv.durationMs; durationCount++; tb.avgMs = totalDuration / durationCount; }
    byTool[inv.request.tool] = tb;

    // By risk tier
    const tierKey = `tier_${inv.riskTier}`;
    const rt = byRiskTier[tierKey] ?? { count: 0, denied: 0 };
    rt.count++;
    if (inv.policyDecision === "deny") rt.denied++;
    byRiskTier[tierKey] = rt;
  }

  // By agent from swarm runs
  const wsSwarms = swarmRuns.filter((r) => r.workspaceId === workspaceId);
  for (const swarm of wsSwarms) {
    for (const profile of swarm.agentProfiles) {
      const ab = byAgent[profile.agentId] ?? { count: 0, tasks: 0 };
      ab.tasks += swarm.tasks.filter((t) => t.agentId === profile.agentId).length;
      ab.count++;
      byAgent[profile.agentId] = ab;
    }
  }

  return {
    workspaceId,
    generatedAt: new Date().toISOString(),
    totalInvocations: wsInv.length,
    allowedInvocations: allowed,
    deniedInvocations: denied,
    failedInvocations: failed,
    pendingApprovals: pending,
    activeSwarmRuns: wsSwarms.filter((r) => r.status === "running").length,
    activeFanOut: wsSwarms.reduce((sum, r) => sum + r.currentFanOut, 0),
    avgDurationMs: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
    byTool,
    byRiskTier,
    byAgent,
  };
}

// ═══════════════════════════════════════════════════════════════
// 12) AGENT PROFILE BUILDER
// ═══════════════════════════════════════════════════════════════

export function buildAgentProfile(input: {
  agentId: string;
  role: SwarmAgentRole;
  workspaceId: string;
  sessionKeyPrefix?: string | undefined;
  customAllow?: string[] | undefined;
  customDeny?: string[] | undefined;
  allowSpawnTargets?: string[] | undefined;
}): SwarmAgentProfile {
  const sessionKey = `agent:${input.agentId}:${input.sessionKeyPrefix ?? input.workspaceId}`;

  // Role-based defaults
  const roleDefaults: Record<SwarmAgentRole, { allow: string[]; deny: string[] }> = {
    coordinator: {
      allow: ["group:sessions", "group:memory", "agents_list"],
      deny: [],
    },
    researcher: {
      allow: ["group:web", "group:fs", "group:memory"],
      deny: [...DEFAULT_SUBAGENT_TOOL_DENY],
    },
    executor: {
      allow: ["group:runtime", "group:fs"],
      deny: [...DEFAULT_SUBAGENT_TOOL_DENY, "browser", "canvas"],
    },
    reviewer: {
      allow: ["group:fs", "group:memory"],
      deny: [...DEFAULT_SUBAGENT_TOOL_DENY, ...["exec", "bash", "process", "write", "edit"]],
    },
    custom: {
      allow: [],
      deny: [...DEFAULT_SUBAGENT_TOOL_DENY],
    },
  };

  const defaults = roleDefaults[input.role];

  return {
    agentId: input.agentId,
    role: input.role,
    sessionKey,
    toolsAllow: expandToolGroups([...defaults.allow, ...(input.customAllow ?? [])]),
    toolsDeny: expandToolGroups([...defaults.deny, ...(input.customDeny ?? [])]),
    toolGroups: [...new Set([...defaults.allow, ...(input.customAllow ?? [])].filter((e) => e.startsWith("group:")))],
    sandboxMode: input.role === "coordinator" ? "off" : "non-main",
    maxConcurrentTasks: input.role === "coordinator" ? 1 : 4,
    allowedSpawnTargets: input.allowSpawnTargets ?? (input.role === "coordinator" ? ["*"] : []),
  };
}
