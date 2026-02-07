import assert from "node:assert/strict";
import test from "node:test";

import { apiError, apiSuccess } from "@ethoxford/contracts";

import { mapAiExecuteResponse, prepareAiExecuteRequest } from "./ai-action.js";

test("prepareAiExecuteRequest requires confirmation for high-risk tools", () => {
  const decision = prepareAiExecuteRequest({
    toolName: "delete_workspace",
    toolInput: { workspaceId: "ws_1" },
    toolRiskClass: "high",
  });

  assert.deepEqual(decision, {
    kind: "requires_confirmation",
    reason: "high_risk_tool",
    message: "This high-risk action requires explicit confirmation.",
  });
});

test("prepareAiExecuteRequest includes confirmation flag after consent", () => {
  const decision = prepareAiExecuteRequest({
    toolName: "delete_workspace",
    toolInput: { workspaceId: "ws_1" },
    toolRiskClass: "high",
    confirmedHighRiskAction: true,
  });

  assert.deepEqual(decision, {
    kind: "request",
    body: {
      toolName: "delete_workspace",
      toolInput: { workspaceId: "ws_1" },
      confirmHighRiskAction: true,
    },
  });
});

test("prepareAiExecuteRequest does not add confirmation for low-risk tools", () => {
  const decision = prepareAiExecuteRequest({
    toolName: "echo",
    toolInput: { value: "ok" },
    toolRiskClass: "low",
  });

  assert.deepEqual(decision, {
    kind: "request",
    body: {
      toolName: "echo",
      toolInput: { value: "ok" },
    },
  });
});

test("mapAiExecuteResponse returns succeeded for ok response", () => {
  const state = mapAiExecuteResponse(apiSuccess("corr_1", { done: true }));
  assert.deepEqual(state, {
    status: "succeeded",
    message: "Action completed successfully.",
    retryable: false,
  });
});

test("mapAiExecuteResponse maps confirmation-required policy denial", () => {
  const state = mapAiExecuteResponse(
    apiError(
      "corr_2",
      "policy_denied",
      "High-risk tool execution requires explicit confirmation",
      {
        confirmationRequired: true,
      },
    ),
  );

  assert.deepEqual(state, {
    status: "requires_confirmation",
    message: "Confirmation is required before executing this high-risk action.",
    retryable: true,
  });
});

test("mapAiExecuteResponse maps generic policy denial to blocked", () => {
  const state = mapAiExecuteResponse(
    apiError("corr_3", "policy_denied", "Tool execution denied for actor roles"),
  );

  assert.deepEqual(state, {
    status: "blocked",
    message: "Action is blocked by policy.",
    retryable: false,
  });
});

test("mapAiExecuteResponse maps moderation-required policy denial to blocked", () => {
  const state = mapAiExecuteResponse(
    apiError("corr_3b", "policy_denied", "Tool execution blocked by moderation policy", {
      moderationRequired: true,
      moderationOutcome: "blocked",
    }),
  );

  assert.deepEqual(state, {
    status: "blocked",
    message: "Action is blocked by safety moderation policy.",
    retryable: false,
  });
});

test("mapAiExecuteResponse maps validation errors to non-retryable failure", () => {
  const state = mapAiExecuteResponse(
    apiError("corr_4", "validation_denied", "toolName is required"),
  );

  assert.deepEqual(state, {
    status: "failed",
    message: "Action failed. Please try again.",
    retryable: false,
  });
});
