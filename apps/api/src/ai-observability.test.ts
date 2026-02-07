import assert from "node:assert/strict";
import test from "node:test";

import type { AgentRunRecord, ToolCallRecord } from "@ethoxford/contracts";

import {
  AI_RUNTIME_ROLLBACK_RUNBOOK_PATH,
  evaluateAiRuntimeAlerts,
  summarizeAiRuntimeMetrics,
  type AiAlertThresholds,
} from "./ai-observability.js";

function createRun(patch: Partial<AgentRunRecord>): AgentRunRecord {
  return {
    runId: "run_default",
    workspaceId: "ws_1",
    correlationId: "corr_1",
    modelName: "gpt-5-mini",
    modelVersion: "v1",
    promptVersion: "1.0.0",
    status: "completed",
    startedAt: "2026-02-07T00:00:00.000Z",
    inputTokens: 10,
    outputTokens: 5,
    estimatedCostUsd: 0.002,
    ...patch,
  };
}

function createToolCall(patch: Partial<ToolCallRecord>): ToolCallRecord {
  return {
    toolCallId: "tcall_default",
    runId: "run_default",
    workspaceId: "ws_1",
    correlationId: "corr_1",
    toolName: "echo",
    toolVersion: "v1",
    stepIndex: 0,
    idempotencyKey: "idemp_default",
    policyDecision: "authorized",
    status: "succeeded",
    attemptCount: 1,
    startedAt: "2026-02-07T00:00:00.000Z",
    ...patch,
  };
}

test("summarizeAiRuntimeMetrics calculates run/tool/token-cost metrics", () => {
  const runs: AgentRunRecord[] = [
    createRun({
      runId: "run_1",
      status: "completed",
      moderationOutcome: "allowed",
      inputTokens: 100,
      outputTokens: 50,
      estimatedCostUsd: 0.02,
    }),
    createRun({
      runId: "run_2",
      status: "failed",
      errorClass: "validation_error",
      moderationOutcome: "blocked",
      inputTokens: 80,
      outputTokens: 0,
      estimatedCostUsd: 0.01,
    }),
    createRun({
      runId: "run_3",
      status: "blocked_policy",
      moderationOutcome: "flagged",
      inputTokens: 20,
      outputTokens: 0,
      estimatedCostUsd: 0.001,
    }),
  ];

  const toolCalls: ToolCallRecord[] = [
    createToolCall({ toolCallId: "t_1", runId: "run_1", status: "succeeded" }),
    createToolCall({
      toolCallId: "t_2",
      runId: "run_2",
      status: "failed",
      errorClass: "validation_error",
    }),
    createToolCall({ toolCallId: "t_3", runId: "run_3", status: "blocked_policy" }),
  ];

  const summary = summarizeAiRuntimeMetrics({
    runs,
    toolCalls,
    workspaceId: "ws_1",
  });

  assert.equal(summary.workspaceId, "ws_1");
  assert.equal(summary.runs.totalCount, 3);
  assert.equal(summary.runs.failedCount, 1);
  assert.equal(summary.runs.blockedPolicyCount, 1);
  assert.equal(summary.runs.moderationBlockedCount, 1);
  assert.equal(summary.runs.moderationFlaggedCount, 1);
  assert.equal(summary.runs.moderationBlockRate, 0.3333);
  assert.equal(summary.runs.schemaMismatchRate, 0.3333);
  assert.equal(summary.toolCalls.totalCount, 3);
  assert.equal(summary.toolCalls.schemaMismatchRate, 0.3333);
  assert.equal(summary.tokenCost.totalTokens, 250);
  assert.equal(summary.tokenCost.totalEstimatedCostUsd, 0.031);
  assert.equal(summary.tokenCost.averageCostPerRunUsd, 0.010333);
});

test("evaluateAiRuntimeAlerts emits configured run/policy/schema/cost alerts", () => {
  const summary = summarizeAiRuntimeMetrics({
    runs: [
      createRun({
        runId: "run_1",
        status: "failed",
        errorClass: "validation_error",
        moderationOutcome: "flagged",
        estimatedCostUsd: 0.03,
      }),
      createRun({
        runId: "run_2",
        status: "blocked_policy",
        moderationOutcome: "blocked",
        estimatedCostUsd: 0.03,
      }),
      createRun({ runId: "run_3", status: "completed", estimatedCostUsd: 0.03 }),
    ],
    toolCalls: [
      createToolCall({
        toolCallId: "t_1",
        runId: "run_1",
        status: "failed",
        errorClass: "validation_error",
      }),
      createToolCall({
        toolCallId: "t_2",
        runId: "run_2",
        status: "blocked_policy",
      }),
      createToolCall({ toolCallId: "t_3", runId: "run_3", status: "succeeded" }),
    ],
  });

  const thresholds: AiAlertThresholds = {
    minRunCount: 1,
    p1RunFailureRate: 0.3,
    p2PolicyBlockRate: 0.3,
    p2ModerationBlockRate: 0.3,
    p2SchemaMismatchRate: 0.2,
    p2AverageCostPerRunUsd: 0.01,
  };

  const evaluation = evaluateAiRuntimeAlerts(summary, thresholds);

  assert.equal(evaluation.alerts.length, 5);
  assert.equal(evaluation.alerts[0]?.code, "run_failure_rate_high");
  assert.equal(evaluation.alerts[1]?.code, "policy_block_rate_high");
  assert.equal(evaluation.alerts[2]?.code, "moderation_block_rate_high");
  assert.equal(evaluation.alerts[3]?.code, "schema_mismatch_rate_high");
  assert.equal(evaluation.alerts[4]?.code, "average_cost_per_run_high");
  assert.equal(evaluation.alerts[0]?.runbook, AI_RUNTIME_ROLLBACK_RUNBOOK_PATH);
});
