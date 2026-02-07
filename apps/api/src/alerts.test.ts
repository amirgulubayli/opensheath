import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTH_INCIDENT_RUNBOOK_PATH,
  evaluateAuthAlerts,
  type AuthAlertThresholds,
} from "./alerts.js";
import { InMemoryRequestMetrics } from "./observability.js";

test("evaluateAuthAlerts returns no alerts below thresholds", () => {
  const metrics = new InMemoryRequestMetrics("api");
  metrics.record({
    method: "POST",
    path: "/auth/sign-in",
    statusCode: 200,
    durationMs: 12,
  });

  const evaluation = evaluateAuthAlerts(metrics.snapshot());

  assert.equal(evaluation.alerts.length, 0);
  assert.equal(evaluation.authTotals.requestCount, 1);
  assert.equal(evaluation.authTotals.failureCount, 0);
});

test("evaluateAuthAlerts emits P1 and P2 alerts when thresholds are crossed", () => {
  const metrics = new InMemoryRequestMetrics("api");
  metrics.record({
    method: "GET",
    path: "/auth/me",
    statusCode: 401,
    durationMs: 4,
    errorCode: "auth_denied",
  });
  metrics.record({
    method: "POST",
    path: "/auth/sign-in",
    statusCode: 401,
    durationMs: 5,
    errorCode: "auth_denied",
  });

  const thresholds: AuthAlertThresholds = {
    minAuthRequestCount: 2,
    p1AuthFailureRate: 0.5,
    p2UnauthorizedAttemptCount: 1,
  };

  const evaluation = evaluateAuthAlerts(metrics.snapshot(), thresholds);

  assert.equal(evaluation.alerts.length, 2);
  assert.equal(evaluation.alerts[0]?.code, "auth_failure_rate_high");
  assert.equal(evaluation.alerts[0]?.runbook, AUTH_INCIDENT_RUNBOOK_PATH);
  assert.equal(evaluation.alerts[1]?.code, "unauthorized_attempt_spike");
  assert.equal(evaluation.alerts[1]?.runbook, AUTH_INCIDENT_RUNBOOK_PATH);
});
