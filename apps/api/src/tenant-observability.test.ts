import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_TENANT_DASHBOARD_NAMES,
  TENANT_ISOLATION_RUNBOOK_PATH,
  InMemoryTenantIsolationMetrics,
  evaluateTenantIsolationAlerts,
  type TenantAlertThresholds,
} from "./tenant-observability.js";

test("tenant metrics track denied and cross-tenant counters", () => {
  const metrics = new InMemoryTenantIsolationMetrics();

  metrics.record({
    method: "POST",
    path: "/workspaces/invite",
    statusCode: 403,
    errorCode: "policy_denied",
    errorMessage: "Actor is not a workspace member",
  });
  metrics.record({
    method: "GET",
    path: "/projects/list",
    statusCode: 200,
  });
  metrics.record({
    method: "GET",
    path: "/ai/runs",
    statusCode: 403,
    errorCode: "policy_denied",
    errorMessage: "Session workspace mismatch",
  });
  metrics.record({
    method: "GET",
    path: "/health",
    statusCode: 200,
  });

  const snapshot = metrics.snapshot();

  assert.equal(snapshot.dashboardNames.isolation, DEFAULT_TENANT_DASHBOARD_NAMES.isolation);
  assert.equal(snapshot.totals.tenantRequestCount, 3);
  assert.equal(snapshot.totals.deniedCount, 2);
  assert.equal(snapshot.totals.policyDeniedCount, 2);
  assert.equal(snapshot.totals.crossTenantDeniedCount, 1);
  assert.equal(snapshot.totals.roleDeniedCount, 1);
  assert.equal(snapshot.totals.membershipDeniedCount, 1);
  assert.equal(snapshot.totals.unauthorizedTenantRate, 0.6667);
  assert.equal(snapshot.paths.length, 3);
});

test("tenant alert evaluation emits threshold alerts with runbook links", () => {
  const metrics = new InMemoryTenantIsolationMetrics();
  metrics.record({
    method: "POST",
    path: "/workspaces/invite",
    statusCode: 403,
    errorCode: "policy_denied",
    errorMessage: "Actor is not a workspace member",
  });
  metrics.record({
    method: "GET",
    path: "/ai/runs",
    statusCode: 403,
    errorCode: "policy_denied",
    errorMessage: "Session workspace mismatch",
  });

  const thresholds: TenantAlertThresholds = {
    minTenantRequestCount: 1,
    p1CrossTenantDeniedCount: 1,
    p2UnauthorizedTenantRate: 0.5,
    p2WorkspaceLifecycleAnomalyRate: 0.5,
    p2MembershipDeniedCount: 1,
  };

  const evaluation = evaluateTenantIsolationAlerts(metrics.snapshot(), thresholds);

  assert.equal(evaluation.alerts.length, 4);
  assert.equal(evaluation.alerts[0]?.code, "cross_tenant_denial_detected");
  assert.equal(evaluation.alerts[1]?.code, "unauthorized_tenant_rate_high");
  assert.equal(evaluation.alerts[2]?.code, "workspace_lifecycle_anomaly_rate_high");
  assert.equal(evaluation.alerts[3]?.code, "membership_denial_spike");
  assert.equal(evaluation.alerts[0]?.runbook, TENANT_ISOLATION_RUNBOOK_PATH);
});
