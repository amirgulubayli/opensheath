import { randomUUID } from "node:crypto";

import {
  isValidAgentRunTransition,
  isValidToolCallTransition,
  type AgentRunRecord,
  type AgentRunStatus,
  type AiErrorClass,
  type ModerationOutcome,
  type ToolCallRecord,
  type ToolCallStatus,
  type ToolRiskClass,
} from "@ethoxford/contracts";

import { DomainError, type RequestContext, type Role } from "./shared.js";

export interface ToolDefinition {
  name: string;
  version: string;
  riskClass: ToolRiskClass;
  requiredRoles: Role[];
  handler: (input: unknown, context: RequestContext) => Promise<unknown>;
}

export interface AgentRuntimeOptions {
  modelName: string;
  modelVersion: string;
  promptVersion: string;
  maxToolRetries: number;
}

export interface AgentExecutionResult {
  run: AgentRunRecord;
  toolCall: ToolCallRecord;
  output?: unknown;
}

export interface ModerationCheckInput {
  toolName: string;
  toolInput: unknown;
  context: RequestContext;
}

export interface ModerationCheckResult {
  outcome: Exclude<ModerationOutcome, "not_run">;
  reason?: string;
  category?: string;
}

export interface ModerationService {
  evaluate(input: ModerationCheckInput): Promise<ModerationCheckResult>;
}

const BLOCKED_PATTERNS: RegExp[] = [
  /\brm\s+-rf\b/i,
  /\bdrop\s+table\b/i,
  /\bdelete\s+all\b/i,
  /\bcredential\s+dump\b/i,
  /\bexfiltrat(e|ion)\b/i,
];

const FLAGGED_PATTERNS: RegExp[] = [
  /\bpassword\b/i,
  /\bsecret\b/i,
  /\bapi[_\s-]?key\b/i,
  /\baccess[_\s-]?token\b/i,
  /\bssn\b/i,
  /\bcredit[_\s-]?card\b/i,
];

export class InMemoryModerationService implements ModerationService {
  async evaluate(input: ModerationCheckInput): Promise<ModerationCheckResult> {
    const serializedInput = JSON.stringify(input.toolInput ?? {}) ?? "";
    const normalized = serializedInput.toLowerCase();

    const blockedPattern = BLOCKED_PATTERNS.find((pattern) => pattern.test(normalized));
    if (blockedPattern) {
      return {
        outcome: "blocked",
        reason: "blocked_pattern_detected",
      };
    }

    const flaggedPattern = FLAGGED_PATTERNS.find((pattern) => pattern.test(normalized));
    if (flaggedPattern) {
      return {
        outcome: "flagged",
        reason: "sensitive_pattern_detected",
      };
    }

    return {
      outcome: "allowed",
    };
  }
}

export class InMemoryToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(definition: ToolDefinition): void {
    if (!definition.name.trim()) {
      throw new DomainError("validation_denied", "Tool name is required", {
        field: "name",
      });
    }

    if (!definition.version.trim()) {
      throw new DomainError("validation_denied", "Tool version is required", {
        field: "version",
      });
    }

    this.tools.set(definition.name, definition);
  }

  get(toolName: string): ToolDefinition {
    const tool = this.tools.get(toolName);

    if (!tool) {
      throw new DomainError("not_found", "Tool not registered", {
        toolName,
      });
    }

    return tool;
  }
}

export class InMemoryAgentRuntimeService {
  private readonly runs = new Map<string, AgentRunRecord>();
  private readonly toolCalls = new Map<string, ToolCallRecord>();

  constructor(
    private readonly registry: InMemoryToolRegistry,
    private readonly options: AgentRuntimeOptions = {
      modelName: "gpt-5-mini",
      modelVersion: "v1",
      promptVersion: "1.0.0",
      maxToolRetries: 2,
    },
    private readonly moderationService: ModerationService = new InMemoryModerationService(),
  ) {}

  async execute(
    context: RequestContext,
    input: {
      toolName: string;
      toolInput: unknown;
      confirmHighRiskAction?: boolean;
      threadId?: string;
    },
  ): Promise<AgentExecutionResult> {
    const workspaceId = this.requireWorkspace(context);
    const startedAt = new Date().toISOString();
    const runId = `run_${randomUUID()}`;
    const run: AgentRunRecord = {
      runId,
      workspaceId,
      correlationId: context.correlationId,
      ...(input.threadId ? { threadId: input.threadId } : {}),
      modelName: this.options.modelName,
      modelVersion: this.options.modelVersion,
      promptVersion: this.options.promptVersion,
      status: "queued",
      startedAt,
      moderationOutcome: "not_run",
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    };
    if (context.actorId !== undefined) {
      run.actorId = context.actorId;
    }
    this.runs.set(runId, run);
    this.transitionRun(runId, "running");

    const toolCallId = `tcall_${randomUUID()}`;
    const toolCall: ToolCallRecord = {
      toolCallId,
      runId,
      workspaceId,
      correlationId: context.correlationId,
      toolName: input.toolName,
      toolVersion: "unknown",
      stepIndex: 0,
      idempotencyKey: `idemp_${randomUUID()}`,
      policyDecision: "authorized",
      status: "requested",
      attemptCount: 0,
      startedAt,
    };
    if (context.actorId !== undefined) {
      toolCall.actorId = context.actorId;
    }
    this.toolCalls.set(toolCallId, toolCall);

    try {
      const tool = this.registry.get(input.toolName);
      this.setToolCall(toolCallId, { toolVersion: tool.version });

      const authorized = tool.requiredRoles.some((role) => context.roles.includes(role));
      if (!authorized) {
        this.transitionToolCall(toolCallId, "blocked_policy");
        this.setToolCall(toolCallId, {
          policyDecision: "blocked_policy",
          errorClass: "policy_denied",
          completedAt: new Date().toISOString(),
        });
        this.transitionRun(runId, "blocked_policy");
        this.setRun(runId, {
          errorClass: "policy_denied",
          completedAt: new Date().toISOString(),
        });
        throw new DomainError("policy_denied", "Tool execution denied for actor roles", {
          toolName: input.toolName,
        });
      }

      if (tool.riskClass === "high" && input.confirmHighRiskAction !== true) {
        this.transitionToolCall(toolCallId, "blocked_policy");
        this.setToolCall(toolCallId, {
          policyDecision: "blocked_policy",
          errorClass: "policy_denied",
          completedAt: new Date().toISOString(),
        });
        this.transitionRun(runId, "blocked_policy");
        this.setRun(runId, {
          errorClass: "policy_denied",
          completedAt: new Date().toISOString(),
        });
        throw new DomainError(
          "policy_denied",
          "High-risk tool execution requires explicit confirmation",
          {
            toolName: input.toolName,
            confirmationRequired: true,
          },
        );
      }

      const moderation = await this.moderationService.evaluate({
        toolName: input.toolName,
        toolInput: input.toolInput,
        context,
      });
      this.setRun(runId, {
        moderationOutcome: moderation.outcome,
      });

      if (moderation.outcome === "blocked") {
        this.transitionToolCall(toolCallId, "blocked_policy");
        this.setToolCall(toolCallId, {
          policyDecision: "blocked_policy",
          errorClass: "policy_denied",
          completedAt: new Date().toISOString(),
        });
        this.transitionRun(runId, "blocked_policy");
        this.setRun(runId, {
          errorClass: "policy_denied",
          completedAt: new Date().toISOString(),
        });
        throw new DomainError(
          "policy_denied",
          "Tool execution blocked by moderation policy",
          {
            toolName: input.toolName,
            moderationRequired: true,
            moderationOutcome: moderation.outcome,
            ...(moderation.reason ? { moderationReason: moderation.reason } : {}),
            ...(moderation.category ? { moderationCategory: moderation.category } : {}),
          },
        );
      }

      this.transitionToolCall(toolCallId, "authorized");
      this.transitionToolCall(toolCallId, "executing");
      this.transitionRun(runId, "waiting_tool");

      let attemptCount = 0;
      let lastErrorClass: AiErrorClass | undefined;
      let output: unknown;
      let completed = false;

      while (attemptCount <= this.options.maxToolRetries && !completed) {
        attemptCount += 1;
        this.setToolCall(toolCallId, { attemptCount });

        try {
          output = await tool.handler(input.toolInput, context);
          completed = true;
        } catch (error: unknown) {
          lastErrorClass = this.mapErrorClass(error);

          if (attemptCount <= this.options.maxToolRetries) {
            this.transitionToolCall(toolCallId, "retrying");
            this.setToolCall(toolCallId, { errorClass: lastErrorClass });
            this.transitionRun(runId, "retrying");
            this.transitionRun(runId, "running");
            this.transitionRun(runId, "waiting_tool");
            this.transitionToolCall(toolCallId, "executing");
          }
        }
      }

      if (!completed) {
        const errorClass = lastErrorClass ?? "unexpected_internal";
        this.transitionToolCall(toolCallId, "failed");
        this.setToolCall(toolCallId, {
          errorClass,
          completedAt: new Date().toISOString(),
        });
        this.transitionRun(runId, "failed");
        this.setRun(runId, {
          errorClass,
          completedAt: new Date().toISOString(),
        });
        throw new DomainError("unavailable", "Tool execution failed", {
          toolName: input.toolName,
        });
      }

      this.transitionToolCall(toolCallId, "succeeded");
      this.setToolCall(toolCallId, {
        completedAt: new Date().toISOString(),
      });
      this.transitionRun(runId, "running");
      this.transitionRun(runId, "completed");
      this.setRun(runId, {
        completedAt: new Date().toISOString(),
        inputTokens: this.estimateTokens(input.toolInput),
        outputTokens: this.estimateTokens(output),
      });
      const finalizedRun = this.requireRun(runId);
      this.setRun(runId, {
        estimatedCostUsd: this.estimateCostUsd(
          finalizedRun.inputTokens,
          finalizedRun.outputTokens,
        ),
      });

      return {
        run: this.requireRun(runId),
        toolCall: this.requireToolCall(toolCallId),
        output,
      };
    } catch (error: unknown) {
      if (error instanceof DomainError) {
        if (error.code !== "policy_denied") {
          const runState = this.requireRun(runId);
          if (!this.isRunTerminal(runState.status)) {
            this.transitionRun(runId, "failed");
            this.setRun(runId, {
              errorClass: this.mapErrorClass(error),
              completedAt: new Date().toISOString(),
            });
          }

          const callState = this.requireToolCall(toolCallId);
          if (!this.isToolCallTerminal(callState.status)) {
            if (callState.status === "requested") {
              this.transitionToolCall(toolCallId, "authorized");
              this.transitionToolCall(toolCallId, "executing");
            }
            this.transitionToolCall(toolCallId, "failed");
            this.setToolCall(toolCallId, {
              errorClass: this.mapErrorClass(error),
              completedAt: new Date().toISOString(),
            });
          }
        }
        throw error;
      }

      const errorClass: AiErrorClass = "unexpected_internal";
      const runState = this.requireRun(runId);
      if (!this.isRunTerminal(runState.status)) {
        this.transitionRun(runId, "failed");
      }
      this.setRun(runId, {
        errorClass,
        completedAt: new Date().toISOString(),
      });

      const callState = this.requireToolCall(toolCallId);
      if (!this.isToolCallTerminal(callState.status)) {
        if (callState.status === "requested") {
          this.transitionToolCall(toolCallId, "authorized");
          this.transitionToolCall(toolCallId, "executing");
        }
        this.transitionToolCall(toolCallId, "failed");
      }
      this.setToolCall(toolCallId, {
        errorClass,
        completedAt: new Date().toISOString(),
      });

      throw new DomainError("internal_error", "Tool execution failed", {
        toolName: input.toolName,
      });
    }
  }

  listRuns(): AgentRunRecord[] {
    return [...this.runs.values()];
  }

  listToolCalls(): ToolCallRecord[] {
    return [...this.toolCalls.values()];
  }

  listToolCallsByRun(runId: string): ToolCallRecord[] {
    return this.listToolCalls().filter((call) => call.runId === runId);
  }

  private requireWorkspace(context: RequestContext): string {
    if (!context.workspaceId) {
      throw new DomainError("validation_denied", "workspaceId is required in context", {
        field: "workspaceId",
      });
    }

    return context.workspaceId;
  }

  private requireRun(runId: string): AgentRunRecord {
    const run = this.runs.get(runId);

    if (!run) {
      throw new DomainError("not_found", "Run not found", {
        runId,
      });
    }

    return run;
  }

  private requireToolCall(toolCallId: string): ToolCallRecord {
    const call = this.toolCalls.get(toolCallId);

    if (!call) {
      throw new DomainError("not_found", "Tool call not found", {
        toolCallId,
      });
    }

    return call;
  }

  private transitionRun(runId: string, nextStatus: AgentRunStatus): void {
    const current = this.requireRun(runId);
    if (!isValidAgentRunTransition(current.status, nextStatus)) {
      throw new DomainError("conflict", "Invalid run transition", {
        runId,
        from: current.status,
        to: nextStatus,
      });
    }

    this.setRun(runId, {
      status: nextStatus,
    });
  }

  private transitionToolCall(toolCallId: string, nextStatus: ToolCallStatus): void {
    const current = this.requireToolCall(toolCallId);
    if (!isValidToolCallTransition(current.status, nextStatus)) {
      throw new DomainError("conflict", "Invalid tool call transition", {
        toolCallId,
        from: current.status,
        to: nextStatus,
      });
    }

    this.setToolCall(toolCallId, {
      status: nextStatus,
    });
  }

  private setRun(runId: string, patch: Partial<AgentRunRecord>): void {
    const current = this.requireRun(runId);
    this.runs.set(runId, {
      ...current,
      ...patch,
    });
  }

  private setToolCall(toolCallId: string, patch: Partial<ToolCallRecord>): void {
    const current = this.requireToolCall(toolCallId);
    this.toolCalls.set(toolCallId, {
      ...current,
      ...patch,
    });
  }

  private isRunTerminal(status: AgentRunStatus): boolean {
    return (
      status === "blocked_policy" ||
      status === "failed" ||
      status === "completed" ||
      status === "escalated_human"
    );
  }

  private isToolCallTerminal(status: ToolCallStatus): boolean {
    return (
      status === "blocked_policy" ||
      status === "failed" ||
      status === "succeeded" ||
      status === "canceled"
    );
  }

  private mapErrorClass(error: unknown): AiErrorClass {
    if (error instanceof DomainError) {
      if (error.code === "validation_denied") {
        return "validation_error";
      }
      if (error.code === "auth_denied") {
        return "authz_denied";
      }
      if (error.code === "policy_denied") {
        return "policy_denied";
      }
      if (error.code === "unavailable") {
        return "dependency_unavailable";
      }
    }

    if (error instanceof Error && error.message.toLowerCase().includes("timeout")) {
      return "timeout";
    }

    return "unexpected_internal";
  }

  private estimateTokens(value: unknown): number {
    if (value === undefined) {
      return 0;
    }

    const serialized = JSON.stringify(value);
    if (!serialized) {
      return 0;
    }

    return Math.max(1, Math.ceil(serialized.length / 4));
  }

  private estimateCostUsd(inputTokens: number, outputTokens: number): number {
    const perTokenUsd = 0.000001;
    const raw = (inputTokens + outputTokens) * perTokenUsd;
    return Math.round(raw * 1_000_000) / 1_000_000;
  }
}
