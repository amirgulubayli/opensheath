import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryRequestMetrics, StructuredLogger } from "./observability.js";

test("InMemoryRequestMetrics aggregates route and auth/error counters", () => {
  const metrics = new InMemoryRequestMetrics("api");
  metrics.record({
    method: "GET",
    path: "/health",
    statusCode: 200,
    durationMs: 10,
  });
  metrics.record({
    method: "GET",
    path: "/auth/me",
    statusCode: 401,
    durationMs: 20,
    errorCode: "auth_denied",
  });
  metrics.record({
    method: "POST",
    path: "/auth/sign-in",
    statusCode: 200,
    durationMs: 5,
  });

  const snapshot = metrics.snapshot();
  assert.equal(snapshot.service, "api");
  assert.equal(snapshot.routes.length, 3);

  const authMe = snapshot.routes.find((route) => route.key === "GET /auth/me");
  assert.equal(authMe?.count, 1);
  assert.equal(authMe?.errorCount, 1);
  assert.equal(authMe?.errorCodeCounts.auth_denied, 1);
  assert.equal(authMe?.statusCodeCounts["401"], 1);

  assert.equal(snapshot.totals.requestCount, 3);
  assert.equal(snapshot.totals.errorCount, 1);
  assert.equal(snapshot.totals.statusCodeCounts["200"], 2);
  assert.equal(snapshot.totals.statusCodeCounts["401"], 1);
  assert.equal(snapshot.totals.errorCodeCounts.auth_denied, 1);

  assert.equal(snapshot.totals.auth.requestCount, 2);
  assert.equal(snapshot.totals.auth.successCount, 1);
  assert.equal(snapshot.totals.auth.failureCount, 1);
  assert.equal(snapshot.totals.auth.unauthorizedAttemptCount, 1);
});

test("StructuredLogger emits machine-readable JSON", () => {
  const lines: string[] = [];
  const logger = new StructuredLogger("api", (line) => {
    lines.push(line);
  });

  logger.log({
    event: "request.complete",
    requestId: "req_1",
    correlationId: "corr_1",
    method: "GET",
    path: "/health",
    statusCode: 200,
  });

  assert.equal(lines.length, 1);
  const parsed = JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
  assert.equal(parsed.service, "api");
  assert.equal(parsed.event, "request.complete");
  assert.equal(parsed.requestId, "req_1");
  assert.equal(parsed.correlationId, "corr_1");
  assert.equal(parsed.severity, "info");
});
