import assert from "node:assert/strict";
import test from "node:test";

import { apiError, apiSuccess } from "@ethoxford/contracts";

import { buildAuthOpsDashboardState } from "./auth-ops-dashboard.js";

test("buildAuthOpsDashboardState maps healthy auth + observability state", () => {
  const state = buildAuthOpsDashboardState({
    sessionResponse: apiSuccess("corr_auth_ops_1", {
      session: {
        sessionId: "sess_1",
        userId: "user_1",
        workspaceId: "ws_1",
        expiresAt: "2026-02-08T00:00:00.000Z",
      },
    }),
    alertEvaluation: {
      generatedAt: "2026-02-07T00:00:00.000Z",
      thresholds: {
        minAuthRequestCount: 10,
        p1AuthFailureRate: 0.4,
        p2UnauthorizedAttemptCount: 10,
      },
      authTotals: {
        requestCount: 20,
        failureCount: 1,
        unauthorizedAttemptCount: 0,
      },
      alerts: [],
    },
  });

  assert.equal(state.status, "healthy");
  assert.equal(state.authState.status, "signed_in");
  assert.equal(state.observability.status, "healthy");
});

test("buildAuthOpsDashboardState maps critical status when p1 auth alerts exist", () => {
  const state = buildAuthOpsDashboardState({
    sessionResponse: apiSuccess("corr_auth_ops_2", {
      session: {
        sessionId: "sess_2",
        userId: "user_1",
        workspaceId: "ws_1",
        expiresAt: "2026-02-08T00:00:00.000Z",
      },
    }),
    alertEvaluation: {
      generatedAt: "2026-02-07T00:00:00.000Z",
      thresholds: {
        minAuthRequestCount: 10,
        p1AuthFailureRate: 0.4,
        p2UnauthorizedAttemptCount: 10,
      },
      authTotals: {
        requestCount: 20,
        failureCount: 10,
        unauthorizedAttemptCount: 12,
      },
      alerts: [
        {
          code: "auth_failure_rate_high",
          severity: "p1",
          value: 0.5,
          threshold: 0.4,
          message: "Authentication failure rate exceeded threshold",
          runbook: "docs/runbook.md",
        },
      ],
    },
  });

  assert.equal(state.status, "critical");
  assert.equal(state.summary, "Auth operations are critical. Immediate intervention is required.");
});

test("buildAuthOpsDashboardState maps degraded state for OAuth provider cancellation", () => {
  const state = buildAuthOpsDashboardState({
    sessionResponse: apiError("corr_auth_ops_3", "auth_denied", "Missing session"),
    alertEvaluation: {
      generatedAt: "2026-02-07T00:00:00.000Z",
      thresholds: {
        minAuthRequestCount: 10,
        p1AuthFailureRate: 0.4,
        p2UnauthorizedAttemptCount: 10,
      },
      authTotals: {
        requestCount: 1,
        failureCount: 1,
        unauthorizedAttemptCount: 1,
      },
      alerts: [],
    },
    oauthCallbackInput: {
      query: new URLSearchParams("error=access_denied"),
    },
  });

  assert.equal(state.status, "degraded");
  assert.equal(state.oauthCallback?.status, "canceled");
  assert.equal(state.authState.status, "session_expired");
});

test("buildAuthOpsDashboardState uses error fallback when alert payload is missing", () => {
  const state = buildAuthOpsDashboardState({
    alertErrorCode: "unavailable",
  });

  assert.equal(state.status, "error");
  assert.equal(state.observability.status, "error");
});
