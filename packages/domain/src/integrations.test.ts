import assert from "node:assert/strict";
import test from "node:test";

import { createEventEnvelope } from "@ethoxford/contracts";

import {
  DomainError,
  InMemoryAutomationEngine,
  InMemoryConnectorService,
  InMemoryEventBus,
  InMemoryNotificationPreferenceService,
  InMemoryWebhookDeliveryService,
} from "./index.js";

const ws1Context = {
  correlationId: "corr_ws1",
  workspaceId: "ws_1",
  actorId: "owner_1",
  roles: ["owner"],
};

test("event bus dedupes repeated source events and records ingestion status", async () => {
  const bus = new InMemoryEventBus();
  let count = 0;

  bus.subscribe("workspace.created", async () => {
    count += 1;
  });

  const event = createEventEnvelope(
    "workspace.created",
    { workspaceId: "ws_1" },
    {
      eventId: "evt_1",
      correlationId: "corr_1",
      workspaceId: "ws_1",
    },
  );

  const first = await bus.publish(event, "test", "external_1");
  const second = await bus.publish(event, "test", "external_1");

  assert.equal(first, true);
  assert.equal(second, false);
  assert.equal(count, 1);

  const records = bus.listIngestionRecords();
  assert.equal(records.length, 2);
  assert.equal(records[0]?.ingestionStatus, "accepted");
  assert.equal(records[1]?.ingestionStatus, "duplicate");
});

test("event bus rejects unsigned events before subscribers run", async () => {
  const bus = new InMemoryEventBus();
  let called = false;

  bus.subscribe("webhook.received", async () => {
    called = true;
  });

  const event = createEventEnvelope(
    "webhook.received",
    { ok: true },
    {
      eventId: "evt_sig_1",
      correlationId: "corr_sig_1",
      workspaceId: "ws_1",
    },
  );

  const accepted = await bus.publish(event, "provider", "sig_1", {
    signatureVerified: false,
  });

  assert.equal(accepted, false);
  assert.equal(called, false);
  const records = bus.listIngestionRecords();
  assert.equal(records[0]?.ingestionStatus, "rejected_signature");
});

test("automation engine retries and records successful run", async () => {
  const engine = new InMemoryAutomationEngine();

  let attempts = 0;
  engine.registerAction("notify", async () => {
    attempts += 1;
    if (attempts < 2) {
      throw new Error("temporary");
    }
  });

  const rule = engine.addRule({
    workspaceId: "ws_1",
    eventType: "workspace.created",
    actionName: "notify",
    maxRetries: 3,
  });

  const event = createEventEnvelope(
    "workspace.created",
    { workspaceId: "ws_1" },
    {
      eventId: "evt_2",
      correlationId: "corr_2",
      workspaceId: "ws_1",
    },
  );

  await engine.process(event);
  const runs = engine.listRuns();

  assert.equal(runs.length, 1);
  assert.equal(runs[0]?.ruleId, rule.ruleId);
  assert.equal(runs[0]?.workspaceId, "ws_1");
  assert.equal(runs[0]?.status, "completed");
  assert.equal(runs[0]?.attempts, 2);
});

test("automation engine dead-letters after exhausted retries", async () => {
  const engine = new InMemoryAutomationEngine();

  engine.registerAction("always_fail", async () => {
    throw new Error("boom");
  });

  engine.addRule({
    workspaceId: "ws_1",
    eventType: "workspace.created",
    actionName: "always_fail",
    maxRetries: 2,
  });

  const event = createEventEnvelope(
    "workspace.created",
    { workspaceId: "ws_1" },
    {
      eventId: "evt_fail",
      correlationId: "corr_fail",
      workspaceId: "ws_1",
    },
  );

  await assert.rejects(
    () => engine.process(event),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.code, "unavailable");
      return true;
    },
  );

  const runs = engine.listRuns();
  assert.equal(runs.length, 1);
  assert.equal(runs[0]?.status, "dead_letter");
  assert.equal(runs[0]?.attempts, 2);
});

test("automation engine runs only workspace-matching rules", async () => {
  const engine = new InMemoryAutomationEngine();

  let ws1Count = 0;
  let ws2Count = 0;

  engine.registerAction("run_ws1", async () => {
    ws1Count += 1;
  });
  engine.registerAction("run_ws2", async () => {
    ws2Count += 1;
  });

  engine.addRule({
    workspaceId: "ws_1",
    eventType: "workspace.created",
    actionName: "run_ws1",
    maxRetries: 1,
  });
  engine.addRule({
    workspaceId: "ws_2",
    eventType: "workspace.created",
    actionName: "run_ws2",
    maxRetries: 1,
  });

  const event = createEventEnvelope(
    "workspace.created",
    { workspaceId: "ws_1" },
    {
      eventId: "evt_scope",
      correlationId: "corr_scope",
      workspaceId: "ws_1",
    },
  );

  await engine.process(event);

  assert.equal(ws1Count, 1);
  assert.equal(ws2Count, 0);
  assert.equal(engine.listRuns("ws_1").length, 1);
  assert.equal(engine.listRuns("ws_2").length, 0);
});

test("connector service records lifecycle and health states", () => {
  const service = new InMemoryConnectorService();

  const connector = service.registerConnector(ws1Context, {
    provider: "slack",
    authType: "oauth",
    credentialReference: "vault://creds/slack/1",
  });

  assert.equal(connector.status, "connected");

  const degraded = service.recordHealth(ws1Context, connector.connectorId, "degraded", {
    errorMessage: "upstream timeout",
  });
  assert.equal(degraded.status, "degraded");
  assert.equal(degraded.lastHealthStatus, "degraded");

  const revoked = service.revokeConnector(ws1Context, connector.connectorId);
  assert.equal(revoked.status, "revoked");

  assert.throws(
    () => service.recordHealth(ws1Context, connector.connectorId, "healthy"),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.code, "conflict");
      return true;
    },
  );
});

test("notification preference service persists workspace-scoped user preferences", () => {
  const service = new InMemoryNotificationPreferenceService();

  const created = service.upsert(ws1Context, {
    channels: {
      email: false,
      inApp: true,
      webhook: true,
    },
  });
  assert.equal(created.workspaceId, "ws_1");
  assert.equal(created.userId, "owner_1");
  assert.equal(created.channels.email, false);

  const fetched = service.getForUser(ws1Context);
  assert.equal(fetched.preferenceId, created.preferenceId);
  assert.equal(fetched.channels.webhook, true);

  const listed = service.listByWorkspace("ws_1");
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.preferenceId, created.preferenceId);
});

test("notification preference service enforces cross-user update permissions", () => {
  const service = new InMemoryNotificationPreferenceService();

  const memberContext = {
    correlationId: "corr_member",
    workspaceId: "ws_1",
    actorId: "member_1",
    roles: ["member"],
  };

  assert.throws(
    () =>
      service.upsert(memberContext, {
        userId: "owner_1",
        channels: {
          email: true,
          inApp: true,
          webhook: false,
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.code, "policy_denied");
      return true;
    },
  );
});

test("webhook delivery service handles dead-letter and replay lifecycle", () => {
  const service = new InMemoryWebhookDeliveryService();

  const queued = service.enqueue(ws1Context, {
    targetUrl: "https://hooks.example.com/endpoint",
    eventType: "invoice.created",
    eventId: "evt_inv_1",
    payload: { invoiceId: "in_1" },
    maxAttempts: 2,
  });

  assert.equal(queued.status, "pending");
  assert.equal(queued.attemptCount, 0);

  const failed = service.recordAttempt(ws1Context, queued.deliveryId, {
    success: false,
    errorMessage: "timeout",
  });
  assert.equal(failed.status, "failed");
  assert.equal(failed.attemptCount, 1);

  const deadLetter = service.recordAttempt(ws1Context, queued.deliveryId, {
    success: false,
    errorMessage: "still failing",
  });
  assert.equal(deadLetter.status, "dead_letter");
  assert.equal(deadLetter.attemptCount, 2);

  const replayed = service.replay(ws1Context, queued.deliveryId);
  assert.equal(replayed.status, "pending");
  assert.equal(replayed.attemptCount, 0);

  const delivered = service.recordAttempt(ws1Context, queued.deliveryId, {
    success: true,
  });
  assert.equal(delivered.status, "delivered");
  assert.equal(delivered.attemptCount, 1);
});
