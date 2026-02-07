import assert from "node:assert/strict";
import test from "node:test";

import { DomainError, InMemoryBillingService } from "./index.js";

test("billing reconciliation and entitlement checks are deterministic", () => {
  const billing = new InMemoryBillingService();

  billing.setEntitlementPolicy({
    planId: "pro",
    features: {
      ai_actions: true,
    },
    quotas: {
      monthly_ai_actions: 2,
    },
  });

  const sub = billing.reconcileWebhook({
    sourceEventId: "evt_bill_1",
    workspaceId: "ws_1",
    type: "subscription.activated",
    planId: "pro",
    correlationId: "corr_bill_1",
  });

  assert.equal(sub.state, "active");
  assert.equal(billing.checkFeature("ws_1", "ai_actions"), true);
  assert.equal(billing.getUiStatus("ws_1"), "active");

  billing.recordUsage("ws_1", "monthly_ai_actions", 1, {
    idempotencyKey: "use_1",
    correlationId: "corr_use_1",
  });
  let quota = billing.checkQuota("ws_1", "monthly_ai_actions");
  assert.equal(quota.allowed, true);
  assert.equal(quota.remaining, 1);

  // duplicate idempotency key should not increment
  billing.recordUsage("ws_1", "monthly_ai_actions", 1, {
    idempotencyKey: "use_1",
    correlationId: "corr_use_1_dup",
  });
  quota = billing.checkQuota("ws_1", "monthly_ai_actions");
  assert.equal(quota.allowed, true);
  assert.equal(quota.remaining, 1);

  billing.recordUsage("ws_1", "monthly_ai_actions", 1, {
    idempotencyKey: "use_2",
  });
  quota = billing.checkQuota("ws_1", "monthly_ai_actions");
  assert.equal(quota.allowed, false);
  assert.equal(quota.remaining, 0);

  const counter = billing.getUsageCounter("ws_1", "monthly_ai_actions");
  assert.ok(counter);
  assert.equal(counter?.consumedUnits, 2);
  assert.equal(counter?.counterVersion, 2);
});

test("billing rejects unsigned webhooks and records event status", () => {
  const billing = new InMemoryBillingService();

  assert.throws(
    () =>
      billing.reconcileWebhook({
        sourceEventId: "evt_bad_sig",
        workspaceId: "ws_1",
        type: "subscription.activated",
        signatureVerified: false,
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.code, "policy_denied");
      return true;
    },
  );

  const events = billing.listWebhookEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0]?.processingStatus, "rejected_signature");
});

test("billing dedupes repeated webhook events", () => {
  const billing = new InMemoryBillingService();

  billing.reconcileWebhook({
    sourceEventId: "evt_dup",
    workspaceId: "ws_1",
    type: "subscription.activated",
    planId: "free",
  });

  const second = billing.reconcileWebhook({
    sourceEventId: "evt_dup",
    workspaceId: "ws_1",
    type: "subscription.changed",
    planId: "pro",
  });

  assert.equal(second.planId, "free");
  const events = billing.listWebhookEvents();
  assert.equal(events.length, 2);
  assert.equal(events[1]?.processingStatus, "duplicate");
});

test("billing analytics events are idempotent and preserve entitlement snapshot", () => {
  const billing = new InMemoryBillingService();

  billing.reconcileWebhook({
    sourceEventId: "evt_analytics_1",
    workspaceId: "ws_1",
    type: "subscription.activated",
    planId: "pro",
  });

  const first = billing.recordAnalyticsEvent({
    workspaceId: "ws_1",
    eventName: "feature_gate_checked",
    eventVersion: "1.0.0",
    correlationId: "corr_analytics_1",
    entitlementSnapshot: {
      featureKey: "ai_actions",
      entitlementStatus: "enabled",
      quotaKey: "monthly_ai_actions",
      consumedUnits: 1,
      limitUnits: 100,
      counterVersion: 4,
    },
    payloadValidationStatus: "valid",
    idempotencyKey: "analytics_1",
  });

  const second = billing.recordAnalyticsEvent({
    workspaceId: "ws_1",
    eventName: "feature_gate_checked",
    eventVersion: "1.0.0",
    correlationId: "corr_analytics_1_dup",
    entitlementSnapshot: {
      featureKey: "ai_actions",
      entitlementStatus: "enabled",
    },
    payloadValidationStatus: "valid",
    idempotencyKey: "analytics_1",
  });

  assert.equal(first.analyticsEventId, second.analyticsEventId);

  const events = billing.listAnalyticsEvents("ws_1");
  assert.equal(events.length, 1);
  assert.equal(events[0]?.entitlementSnapshot.featureKey, "ai_actions");
  assert.equal(events[0]?.payloadValidationStatus, "valid");
});

test("billing emits integrity anomalies when plan snapshot drifts", () => {
  const billing = new InMemoryBillingService();

  billing.reconcileWebhook({
    sourceEventId: "evt_analytics_2",
    workspaceId: "ws_2",
    type: "subscription.activated",
    planId: "free",
  });

  billing.recordAnalyticsEvent({
    workspaceId: "ws_2",
    eventName: "quota_enforcement_decision",
    eventVersion: "1.0.0",
    correlationId: "corr_drift_1",
    planId: "pro",
    entitlementSnapshot: {
      featureKey: "ai_actions",
      entitlementStatus: "grace",
    },
    payloadValidationStatus: "valid",
  });

  const anomalies = billing.listIntegrityAnomalies("ws_2");
  assert.equal(anomalies.length, 1);
  assert.equal(anomalies[0]?.expectedPlanId, "free");
  assert.equal(anomalies[0]?.observedPlanId, "pro");
});
