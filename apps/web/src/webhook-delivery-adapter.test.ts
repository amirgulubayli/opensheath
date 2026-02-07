import assert from "node:assert/strict";
import test from "node:test";

import { apiError, apiSuccess } from "@ethoxford/contracts";

import {
  mapWebhookDeliveriesToState,
  mapWebhookDeliveryMutationResponse,
} from "./webhook-delivery-adapter.js";

test("mapWebhookDeliveriesToState maps delivery rows sorted by updatedAt", () => {
  const state = mapWebhookDeliveriesToState(
    apiSuccess("corr_wh", {
      deliveries: [
        {
          deliveryId: "wh_1",
          workspaceId: "ws_1",
          targetUrl: "https://hooks.example.com/1",
          eventType: "invoice.created",
          eventId: "evt_1",
          payload: { invoiceId: "in_1" },
          idempotencyKey: "whk_1",
          attemptCount: 1,
          maxAttempts: 3,
          status: "failed",
          queuedAt: "2026-02-07T09:00:00.000Z",
          updatedAt: "2026-02-07T09:01:00.000Z",
          nextRetryAt: "2026-02-07T09:06:00.000Z",
          lastErrorMessage: "timeout",
        },
        {
          deliveryId: "wh_2",
          workspaceId: "ws_1",
          targetUrl: "https://hooks.example.com/2",
          eventType: "invoice.created",
          eventId: "evt_2",
          payload: { invoiceId: "in_2" },
          idempotencyKey: "whk_2",
          attemptCount: 2,
          maxAttempts: 2,
          status: "dead_letter",
          queuedAt: "2026-02-07T10:00:00.000Z",
          updatedAt: "2026-02-07T10:02:00.000Z",
          completedAt: "2026-02-07T10:02:00.000Z",
          lastErrorMessage: "still failing",
        },
      ],
    }),
  );

  assert.equal(state.status, "ready");
  assert.equal(state.deliveries.length, 2);
  assert.equal(state.deliveries[0]?.deliveryId, "wh_2");
  assert.equal(state.deliveries[0]?.statusLabel, "Dead Letter");
  assert.equal(state.deliveries[0]?.canReplay, true);
  assert.equal(state.deliveries[1]?.statusLabel, "Failed");
  assert.equal(state.deliveries[1]?.attemptSummary, "1/3");
});

test("mapWebhookDeliveriesToState returns empty and error states", () => {
  const empty = mapWebhookDeliveriesToState(
    apiSuccess("corr_wh_2", {
      deliveries: [],
    }),
  );
  assert.equal(empty.status, "empty");

  const error = mapWebhookDeliveriesToState(
    apiError("corr_wh_3", "unavailable", "Downstream unavailable"),
  );
  assert.equal(error.status, "error");
});

test("mapWebhookDeliveryMutationResponse maps updated payload", () => {
  const state = mapWebhookDeliveryMutationResponse(
    apiSuccess("corr_wh_mut", {
      delivery: {
        deliveryId: "wh_3",
        workspaceId: "ws_1",
        targetUrl: "https://hooks.example.com/3",
        eventType: "invoice.created",
        eventId: "evt_3",
        payload: { invoiceId: "in_3" },
        idempotencyKey: "whk_3",
        attemptCount: 1,
        maxAttempts: 3,
        status: "delivered",
        queuedAt: "2026-02-07T11:00:00.000Z",
        updatedAt: "2026-02-07T11:01:00.000Z",
        completedAt: "2026-02-07T11:01:00.000Z",
      },
    }),
  );

  assert.equal(state.status, "updated");
  assert.equal(state.retryable, false);
  assert.equal(state.delivery?.statusLabel, "Delivered");
  assert.equal(state.delivery?.canReplay, false);
});

test("mapWebhookDeliveryMutationResponse maps validation errors as non-retryable", () => {
  const state = mapWebhookDeliveryMutationResponse(
    apiError("corr_wh_mut_2", "validation_denied", "Invalid payload"),
  );

  assert.equal(state.status, "error");
  assert.equal(state.retryable, false);
});
