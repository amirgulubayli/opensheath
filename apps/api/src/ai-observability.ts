import type { AgentRunRecord, ToolCallRecord } from "@ethoxford/contracts";

export type AiAlertSeverity = "p1" | "p2";

export interface AiDashboardNames {
  runReliability: string;
  policySafety: string;
  tokenCost: string;
}

export interface AiRunMetricsSnapshot {
  totalCount: number;
  completedCount: number;
  failedCount: number;
  blockedPolicyCount: number;
  moderationBlockedCount: number;
  moderationFlaggedCount: number;
  validationErrorCount: number;
  failureRate: number;
  policyBlockRate: number;
  moderationBlockRate: number;
  schemaMismatchRate: number;
}

export interface AiToolCallMetricsSnapshot {
  totalCount: number;
  succeededCount: number;
  failedCount: number;
  blockedPolicyCount: number;
  validationErrorCount: number;
  policyBlockRate: number;
  schemaMismatchRate: number;
}

export interface AiTokenCostMetricsSnapshot {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  averageTokensPerRun: number;
  totalEstimatedCostUsd: number;
  averageCostPerRunUsd: number;
}

export interface AiRuntimeMetricsSnapshot {
  generatedAt: string;
  workspaceId?: string;
  dashboardNames: AiDashboardNames;
  runs: AiRunMetricsSnapshot;
  toolCalls: AiToolCallMetricsSnapshot;
  tokenCost: AiTokenCostMetricsSnapshot;
}

export interface AiAlertThresholds {
  minRunCount: number;
  p1RunFailureRate: number;
  p2PolicyBlockRate: number;
  p2ModerationBlockRate: number;
  p2SchemaMismatchRate: number;
  p2AverageCostPerRunUsd: number;
}

export interface AiRuntimeAlert {
  code:
    | "run_failure_rate_high"
    | "policy_block_rate_high"
    | "moderation_block_rate_high"
    | "schema_mismatch_rate_high"
    | "average_cost_per_run_high";
  severity: AiAlertSeverity;
  value: number;
  threshold: number;
  dashboard: string;
  message: string;
  runbook: string;
}

export interface AiAlertEvaluation {
  generatedAt: string;
  thresholds: AiAlertThresholds;
  snapshot: AiRuntimeMetricsSnapshot;
  alerts: AiRuntimeAlert[];
}

export const AI_RUNTIME_ROLLBACK_RUNBOOK_PATH =
  "docs/05-engineering-playbooks/ai-runtime-evals-and-rollback-playbook.md";

export const DEFAULT_AI_DASHBOARD_NAMES: AiDashboardNames = {
  runReliability: "ai-runtime-run-reliability-v1",
  policySafety: "ai-runtime-policy-safety-v1",
  tokenCost: "ai-runtime-token-cost-v1",
};

export const DEFAULT_AI_ALERT_THRESHOLDS: AiAlertThresholds = {
  minRunCount: 10,
  p1RunFailureRate: 0.2,
  p2PolicyBlockRate: 0.3,
  p2ModerationBlockRate: 0.2,
  p2SchemaMismatchRate: 0.1,
  p2AverageCostPerRunUsd: 0.01,
};

function round(value: number, decimals = 4): number {
  return Number(value.toFixed(decimals));
}

function rate(count: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return count / total;
}

export function summarizeAiRuntimeMetrics(input: {
  runs: AgentRunRecord[];
  toolCalls: ToolCallRecord[];
  workspaceId?: string;
  dashboardNames?: AiDashboardNames;
}): AiRuntimeMetricsSnapshot {
  const runCount = input.runs.length;
  const failedRuns = input.runs.filter((run) => run.status === "failed").length;
  const blockedRuns = input.runs.filter((run) => run.status === "blocked_policy").length;
  const moderationBlockedRuns = input.runs.filter(
    (run) => run.moderationOutcome === "blocked",
  ).length;
  const moderationFlaggedRuns = input.runs.filter(
    (run) => run.moderationOutcome === "flagged",
  ).length;
  const completedRuns = input.runs.filter((run) => run.status === "completed").length;
  const validationErrorRuns = input.runs.filter(
    (run) => run.errorClass === "validation_error",
  ).length;

  const toolCallCount = input.toolCalls.length;
  const failedToolCalls = input.toolCalls.filter((call) => call.status === "failed").length;
  const blockedToolCalls = input.toolCalls.filter(
    (call) => call.status === "blocked_policy",
  ).length;
  const succeededToolCalls = input.toolCalls.filter(
    (call) => call.status === "succeeded",
  ).length;
  const validationErrorToolCalls = input.toolCalls.filter(
    (call) => call.errorClass === "validation_error",
  ).length;

  const totalInputTokens = input.runs.reduce((sum, run) => sum + run.inputTokens, 0);
  const totalOutputTokens = input.runs.reduce((sum, run) => sum + run.outputTokens, 0);
  const totalEstimatedCostUsd = input.runs.reduce(
    (sum, run) => sum + run.estimatedCostUsd,
    0,
  );

  return {
    generatedAt: new Date().toISOString(),
    ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
    dashboardNames: input.dashboardNames ?? DEFAULT_AI_DASHBOARD_NAMES,
    runs: {
      totalCount: runCount,
      completedCount: completedRuns,
      failedCount: failedRuns,
      blockedPolicyCount: blockedRuns,
      moderationBlockedCount: moderationBlockedRuns,
      moderationFlaggedCount: moderationFlaggedRuns,
      validationErrorCount: validationErrorRuns,
      failureRate: round(rate(failedRuns, runCount)),
      policyBlockRate: round(rate(blockedRuns, runCount)),
      moderationBlockRate: round(rate(moderationBlockedRuns, runCount)),
      schemaMismatchRate: round(rate(validationErrorRuns, runCount)),
    },
    toolCalls: {
      totalCount: toolCallCount,
      succeededCount: succeededToolCalls,
      failedCount: failedToolCalls,
      blockedPolicyCount: blockedToolCalls,
      validationErrorCount: validationErrorToolCalls,
      policyBlockRate: round(rate(blockedToolCalls, toolCallCount)),
      schemaMismatchRate: round(rate(validationErrorToolCalls, toolCallCount)),
    },
    tokenCost: {
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      averageTokensPerRun: runCount > 0 ? round((totalInputTokens + totalOutputTokens) / runCount, 2) : 0,
      totalEstimatedCostUsd: round(totalEstimatedCostUsd, 6),
      averageCostPerRunUsd: runCount > 0 ? round(totalEstimatedCostUsd / runCount, 6) : 0,
    },
  };
}

export function evaluateAiRuntimeAlerts(
  snapshot: AiRuntimeMetricsSnapshot,
  thresholds: AiAlertThresholds = DEFAULT_AI_ALERT_THRESHOLDS,
): AiAlertEvaluation {
  const alerts: AiRuntimeAlert[] = [];

  if (
    snapshot.runs.totalCount >= thresholds.minRunCount &&
    snapshot.runs.failureRate >= thresholds.p1RunFailureRate
  ) {
    alerts.push({
      code: "run_failure_rate_high",
      severity: "p1",
      value: snapshot.runs.failureRate,
      threshold: thresholds.p1RunFailureRate,
      dashboard: snapshot.dashboardNames.runReliability,
      message: "AI run failure rate exceeded threshold",
      runbook: AI_RUNTIME_ROLLBACK_RUNBOOK_PATH,
    });
  }

  if (
    snapshot.runs.totalCount >= thresholds.minRunCount &&
    snapshot.runs.policyBlockRate >= thresholds.p2PolicyBlockRate
  ) {
    alerts.push({
      code: "policy_block_rate_high",
      severity: "p2",
      value: snapshot.runs.policyBlockRate,
      threshold: thresholds.p2PolicyBlockRate,
      dashboard: snapshot.dashboardNames.policySafety,
      message: "AI policy block rate exceeded threshold",
      runbook: AI_RUNTIME_ROLLBACK_RUNBOOK_PATH,
    });
  }

  if (
    snapshot.runs.totalCount >= thresholds.minRunCount &&
    snapshot.runs.moderationBlockRate >= thresholds.p2ModerationBlockRate
  ) {
    alerts.push({
      code: "moderation_block_rate_high",
      severity: "p2",
      value: snapshot.runs.moderationBlockRate,
      threshold: thresholds.p2ModerationBlockRate,
      dashboard: snapshot.dashboardNames.policySafety,
      message: "AI moderation block rate exceeded threshold",
      runbook: AI_RUNTIME_ROLLBACK_RUNBOOK_PATH,
    });
  }

  if (
    snapshot.runs.totalCount >= thresholds.minRunCount &&
    Math.max(snapshot.runs.schemaMismatchRate, snapshot.toolCalls.schemaMismatchRate) >=
      thresholds.p2SchemaMismatchRate
  ) {
    alerts.push({
      code: "schema_mismatch_rate_high",
      severity: "p2",
      value: Math.max(snapshot.runs.schemaMismatchRate, snapshot.toolCalls.schemaMismatchRate),
      threshold: thresholds.p2SchemaMismatchRate,
      dashboard: snapshot.dashboardNames.runReliability,
      message: "AI schema/contract mismatch rate exceeded threshold",
      runbook: AI_RUNTIME_ROLLBACK_RUNBOOK_PATH,
    });
  }

  if (
    snapshot.runs.totalCount >= thresholds.minRunCount &&
    snapshot.tokenCost.averageCostPerRunUsd >= thresholds.p2AverageCostPerRunUsd
  ) {
    alerts.push({
      code: "average_cost_per_run_high",
      severity: "p2",
      value: snapshot.tokenCost.averageCostPerRunUsd,
      threshold: thresholds.p2AverageCostPerRunUsd,
      dashboard: snapshot.dashboardNames.tokenCost,
      message: "Average AI run cost exceeded threshold",
      runbook: AI_RUNTIME_ROLLBACK_RUNBOOK_PATH,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    thresholds,
    snapshot,
    alerts,
  };
}
