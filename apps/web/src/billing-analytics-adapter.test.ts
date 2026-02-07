import assert from "node:assert/strict";
import test from "node:test";

import { apiError, apiSuccess } from "@ethoxford/contracts";

import {
  mapAnalyticsEventsToTimeline,
  mapIntegrityAnomaliesToCards,
} from "./billing-analytics-adapter.js";

test("mapAnalyticsEventsToTimeline maps and sorts analytics events", () => {
  const state = mapAnalyticsEventsToTimeline(
    apiSuccess("corr_analytics", {
      events: [
        {
          analyticsEventId: "ae_1",
          workspaceId: "ws_1",
          eventName: "entitlement.checked",
          eventVersion: "v1",
          occurredAt: "2026-02-06T09:00:00.000Z",
          correlationId: "corr_analytics",
          planId: "free",
          entitlementSnapshot: {
            featureKey: "ai_actions",
            entitlementStatus: "enabled",
            quotaKey: "monthly_ai_actions",
            consumedUnits: 3,
            limitUnits: 100,
          },
          payloadValidationStatus: "valid",
        },
        {
          analyticsEventId: "ae_2",
          workspaceId: "ws_1",
          eventName: "entitlement.checked",
          eventVersion: "v1",
          occurredAt: "2026-02-07T09:00:00.000Z",
          correlationId: "corr_analytics",
          planId: "pro",
          entitlementSnapshot: {
            featureKey: "ai_actions",
            entitlementStatus: "grace",
          },
          payloadValidationStatus: "missing_required_fields",
        },
      ],
    }),
  );

  assert.equal(state.status, "ready");
  assert.equal(state.rows.length, 2);
  assert.equal(state.rows[0]?.id, "ae_2");
  assert.equal(state.rows[0]?.payloadValidationLabel, "Missing required fields");
  assert.equal(state.rows[1]?.entitlementSummary, "ai_actions: enabled (monthly_ai_actions 3/100)");
});

test("mapAnalyticsEventsToTimeline maps errors to error state", () => {
  const state = mapAnalyticsEventsToTimeline(
    apiError("corr_analytics_2", "unavailable", "Downstream unavailable"),
  );

  assert.equal(state.status, "error");
  assert.equal(state.rows.length, 0);
});

test("mapIntegrityAnomaliesToCards maps anomaly cards sorted by detectedAt", () => {
  const state = mapIntegrityAnomaliesToCards(
    apiSuccess("corr_anomaly", {
      anomalies: [
        {
          anomalyId: "an_1",
          workspaceId: "ws_1",
          eventName: "entitlement.checked",
          expectedPlanId: "pro",
          observedPlanId: "free",
          correlationId: "corr_1",
          detectedAt: "2026-02-06T11:00:00.000Z",
        },
        {
          anomalyId: "an_2",
          workspaceId: "ws_1",
          eventName: "entitlement.checked",
          expectedPlanId: "enterprise",
          observedPlanId: "pro",
          correlationId: "corr_2",
          detectedAt: "2026-02-07T11:00:00.000Z",
        },
      ],
    }),
  );

  assert.equal(state.status, "ready");
  assert.equal(state.cards.length, 2);
  assert.equal(state.cards[0]?.id, "an_2");
  assert.equal(state.cards[0]?.mismatchSummary, "enterprise -> pro");
});

test("mapIntegrityAnomaliesToCards returns empty state when no anomalies", () => {
  const state = mapIntegrityAnomaliesToCards(
    apiSuccess("corr_anomaly_2", {
      anomalies: [],
    }),
  );

  assert.equal(state.status, "empty");
  assert.equal(state.cards.length, 0);
});
