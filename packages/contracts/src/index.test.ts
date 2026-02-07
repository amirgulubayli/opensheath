import assert from "node:assert/strict";
import test from "node:test";

import {
  type AuthzRegressionRun,
  type ReleaseGateDashboard,
  apiError,
  apiSuccess,
  createEventEnvelope,
  CONTRACTS_VERSION,
  type ConnectorRecord,
  type EventIngestionRecord,
  type NotificationPreferenceRecord,
  type OutboundWebhookDeliveryRecord,
  type AuthAlertEvaluation,
  isValidAgentRunTransition,
  normalizeAppPath,
  isValidToolCallTransition,
} from "./index.js";

test("createEventEnvelope applies defaults and required fields", () => {
  const envelope = createEventEnvelope(
    "workspace.created",
    { workspaceId: "w_123" },
    {
      eventId: "evt_1",
      correlationId: "corr_1",
      workspaceId: "w_123",
      actorId: "u_123",
    },
  );

  assert.equal(envelope.eventId, "evt_1");
  assert.equal(envelope.eventType, "workspace.created");
  assert.equal(envelope.correlationId, "corr_1");
  assert.equal(envelope.version, CONTRACTS_VERSION);
  assert.equal(envelope.workspaceId, "w_123");
  assert.equal(envelope.actorId, "u_123");
  assert.deepEqual(envelope.payload, { workspaceId: "w_123" });
});

test("api helpers produce deterministic response envelopes", () => {
  const success = apiSuccess("corr_2", { status: "ok" });
  assert.deepEqual(success, {
    ok: true,
    correlationId: "corr_2",
    data: { status: "ok" },
  });

  const failure = apiError("corr_3", "auth_denied", "Missing session", {
    reason: "cookie_absent",
  });

  assert.deepEqual(failure, {
    ok: false,
    correlationId: "corr_3",
    code: "auth_denied",
    message: "Missing session",
    details: {
      reason: "cookie_absent",
    },
  });
});

test("agent run transition rules enforce contract", () => {
  assert.equal(isValidAgentRunTransition("queued", "running"), true);
  assert.equal(isValidAgentRunTransition("running", "waiting_tool"), true);
  assert.equal(isValidAgentRunTransition("running", "queued"), false);
  assert.equal(isValidAgentRunTransition("completed", "running"), false);
});

test("tool call transition rules enforce contract", () => {
  assert.equal(isValidToolCallTransition("requested", "authorized"), true);
  assert.equal(isValidToolCallTransition("authorized", "executing"), true);
  assert.equal(isValidToolCallTransition("executing", "retrying"), true);
  assert.equal(isValidToolCallTransition("blocked_policy", "executing"), false);
});

test("normalizeAppPath keeps frontend route keys deterministic", () => {
  assert.equal(normalizeAppPath(""), "/");
  assert.equal(normalizeAppPath("/"), "/");
  assert.equal(normalizeAppPath("dashboard"), "/dashboard");
  assert.equal(normalizeAppPath("/dashboard/"), "/dashboard");
});

test("release/authz dashboard contract shapes are deterministic", () => {
  const regression: AuthzRegressionRun = {
    runId: "authz_run_1",
    suiteId: "authz_suite",
    passed: true,
    totalTests: 12,
    passedTests: 12,
    failedTests: 0,
    startedAt: "2026-02-07T00:00:00.000Z",
    completedAt: "2026-02-07T00:05:00.000Z",
  };

  const dashboard: ReleaseGateDashboard = {
    gate: "tenant_isolation",
    ready: true,
    missing: [],
    checks: {
      evidence: {
        testsPassed: true,
        observabilityVerified: true,
        rollbackVerified: true,
        docsUpdated: true,
      },
      authzRegression: {
        required: true,
        present: true,
        passed: true,
        runId: regression.runId,
        completedAt: regression.completedAt,
        failedTests: regression.failedTests,
      },
    },
  };

  assert.equal(dashboard.gate, "tenant_isolation");
  assert.equal(dashboard.checks.authzRegression.present, true);
  assert.equal(dashboard.checks.authzRegression.failedTests, 0);
});

test("auth alert contract shape can be represented with deterministic fields", () => {
  const evaluation: AuthAlertEvaluation = {
    generatedAt: new Date().toISOString(),
    thresholds: {
      minAuthRequestCount: 10,
      p1AuthFailureRate: 0.4,
      p2UnauthorizedAttemptCount: 10,
    },
    authTotals: {
      requestCount: 20,
      failureCount: 9,
      unauthorizedAttemptCount: 12,
    },
    alerts: [
      {
        code: "auth_failure_rate_high",
        severity: "p1",
        value: 0.45,
        threshold: 0.4,
        message: "Authentication failure rate exceeded threshold",
        runbook: "docs/runbook.md",
      },
    ],
  };

  assert.equal(evaluation.alerts[0]?.code, "auth_failure_rate_high");
  assert.equal(evaluation.authTotals.unauthorizedAttemptCount, 12);
});

test("integration and webhook contract shapes are deterministic", () => {
  const connector: ConnectorRecord = {
    connectorId: "conn_1",
    workspaceId: "ws_1",
    provider: "slack",
    authType: "oauth",
    credentialReference: "vault://connectors/slack/1",
    status: "degraded",
    createdAt: "2026-02-07T00:00:00.000Z",
    updatedAt: "2026-02-07T01:00:00.000Z",
    lastHealthStatus: "degraded",
    lastErrorMessage: "timeout",
  };

  const ingestion: EventIngestionRecord = {
    sourceSystem: "stripe",
    sourceEventId: "evt_ext_1",
    eventType: "invoice.created",
    eventId: "evt_1",
    signatureVerified: true,
    receivedAt: "2026-02-07T01:30:00.000Z",
    ingestionStatus: "accepted",
    correlationId: "corr_1",
    workspaceId: "ws_1",
  };

  const delivery: OutboundWebhookDeliveryRecord = {
    deliveryId: "wh_1",
    workspaceId: "ws_1",
    targetUrl: "https://hooks.example.com/outbound",
    eventType: "invoice.created",
    eventId: "evt_1",
    payload: { invoiceId: "in_1" },
    idempotencyKey: "whk_evt_1_abc",
    attemptCount: 2,
    maxAttempts: 3,
    status: "failed",
    queuedAt: "2026-02-07T01:00:00.000Z",
    updatedAt: "2026-02-07T01:10:00.000Z",
    nextRetryAt: "2026-02-07T01:15:00.000Z",
    lastErrorMessage: "timeout",
  };

  assert.equal(connector.status, "degraded");
  assert.equal(ingestion.ingestionStatus, "accepted");
  assert.equal(delivery.status, "failed");
});

test("notification preference contract shape is deterministic", () => {
  const preference: NotificationPreferenceRecord = {
    preferenceId: "npref_1",
    workspaceId: "ws_1",
    userId: "usr_1",
    channels: {
      email: false,
      inApp: true,
      webhook: true,
    },
    createdAt: "2026-02-07T00:00:00.000Z",
    updatedAt: "2026-02-07T01:00:00.000Z",
  };

  assert.equal(preference.channels.email, false);
  assert.equal(preference.channels.webhook, true);
});
