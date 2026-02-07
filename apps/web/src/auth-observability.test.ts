import assert from "node:assert/strict";
import test from "node:test";

import type { AuthAlertEvaluation } from "@ethoxford/contracts";

import {
  authObservabilityErrorState,
  buildAuthAlertThresholdQuery,
  mapAuthAlertEvaluationToViewModel,
} from "./auth-observability.js";

function baseEvaluation(): AuthAlertEvaluation {
  return {
    generatedAt: "2026-02-07T00:00:00.000Z",
    thresholds: {
      minAuthRequestCount: 10,
      p1AuthFailureRate: 0.4,
      p2UnauthorizedAttemptCount: 10,
    },
    authTotals: {
      requestCount: 20,
      failureCount: 2,
      unauthorizedAttemptCount: 1,
    },
    alerts: [],
  };
}

test("mapAuthAlertEvaluationToViewModel maps healthy evaluation", () => {
  const result = mapAuthAlertEvaluationToViewModel(baseEvaluation());

  assert.equal(result.status, "healthy");
  assert.equal(result.severity, "none");
  assert.equal(result.alerts.length, 0);
  assert.equal(result.summary, "Auth pathways are healthy. No active auth alerts.");
});

test("mapAuthAlertEvaluationToViewModel maps critical alert payloads", () => {
  const evaluation = baseEvaluation();
  evaluation.alerts = [
    {
      code: "auth_failure_rate_high",
      severity: "p1",
      value: 0.61,
      threshold: 0.4,
      message: "Authentication failure rate exceeded threshold",
      runbook: "docs/runbook.md",
    },
    {
      code: "unauthorized_attempt_spike",
      severity: "p2",
      value: 12,
      threshold: 10,
      message: "Unauthorized attempt volume exceeded threshold",
      runbook: "docs/runbook.md",
    },
  ];

  const result = mapAuthAlertEvaluationToViewModel(evaluation);

  assert.equal(result.status, "critical");
  assert.equal(result.severity, "p1");
  assert.equal(result.alerts[0]?.title, "Authentication failures elevated");
  assert.equal(result.alerts[0]?.valueLabel, "61%");
  assert.equal(result.alerts[0]?.thresholdLabel, "40%");
  assert.equal(result.alerts[1]?.title, "Unauthorized attempts elevated");
  assert.equal(result.alerts[1]?.valueLabel, "12");
  assert.equal(result.alerts[1]?.thresholdLabel, "10");
});

test("authObservabilityErrorState maps retryability by error code", () => {
  const unavailable = authObservabilityErrorState("unavailable");
  assert.equal(unavailable.status, "error");
  assert.equal(unavailable.retryable, true);

  const denied = authObservabilityErrorState("policy_denied");
  assert.equal(denied.status, "error");
  assert.equal(denied.retryable, false);
});

test("buildAuthAlertThresholdQuery maps API query keys", () => {
  const query = buildAuthAlertThresholdQuery({
    minAuthRequestCount: 25,
    p1AuthFailureRate: 0.5,
    p2UnauthorizedAttemptCount: 7,
  });

  assert.equal(
    query,
    "minAuthRequests=25&p1FailureRate=0.5&p2UnauthorizedAttempts=7",
  );
});
