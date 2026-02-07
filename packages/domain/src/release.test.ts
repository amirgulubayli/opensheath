import assert from "node:assert/strict";
import test from "node:test";

import { ReleaseReadinessService } from "./index.js";

test("release readiness requires all mandatory evidence", () => {
  const release = new ReleaseReadinessService();

  let result = release.evaluate("tenant_isolation");
  assert.equal(result.ready, false);
  assert.equal(result.missing.length, 4);

  release.record("tenant_isolation", {
    testsPassed: true,
    observabilityVerified: true,
    rollbackVerified: true,
    docsUpdated: true,
  });

  result = release.evaluate("tenant_isolation");
  assert.equal(result.ready, true);
  assert.deepEqual(result.missing, []);
});

test("release dashboard requires authz regression for tenant isolation gate", () => {
  const release = new ReleaseReadinessService();

  release.record("tenant_isolation", {
    testsPassed: true,
    observabilityVerified: true,
    rollbackVerified: true,
    docsUpdated: true,
  });

  let dashboard = release.evaluateDashboard("tenant_isolation");
  assert.equal(dashboard.ready, false);
  assert.equal(dashboard.checks.authzRegression.required, true);
  assert.equal(dashboard.checks.authzRegression.present, false);
  assert.equal(dashboard.missing.includes("authzRegressionRun"), true);

  release.recordAuthzRegression("tenant_isolation", {
    passed: true,
    totalTests: 10,
    passedTests: 10,
    failedTests: 0,
    suiteId: "authz_suite_v1",
  });

  dashboard = release.evaluateDashboard("tenant_isolation");
  assert.equal(dashboard.ready, true);
  assert.equal(dashboard.checks.authzRegression.present, true);
  assert.equal(dashboard.checks.authzRegression.passed, true);
});

test("release dashboard keeps non-tenant gates independent from authz regression", () => {
  const release = new ReleaseReadinessService();

  release.record("auth_shell", {
    testsPassed: true,
    observabilityVerified: true,
    rollbackVerified: true,
    docsUpdated: true,
  });

  const dashboard = release.evaluateDashboard("auth_shell");
  assert.equal(dashboard.ready, true);
  assert.equal(dashboard.checks.authzRegression.required, false);
  assert.equal(dashboard.checks.authzRegression.passed, true);
});
