import assert from "node:assert/strict";
import test from "node:test";

import { apiError, apiSuccess } from "@ethoxford/contracts";

import {
  buildIntegrationControlPlaneSummary,
  type BuildIntegrationControlPlaneInput,
} from "./integration-control-plane.js";

function healthyInput(): BuildIntegrationControlPlaneInput {
  return {
    connectorsResponse: apiSuccess("corr_icp_1", {
      connectors: [
        {
          connectorId: "conn_1",
          workspaceId: "ws_1",
          provider: "slack",
          authType: "oauth",
          credentialReference: "vault://x",
          status: "connected",
          createdAt: "2026-02-07T09:00:00.000Z",
          updatedAt: "2026-02-07T10:00:00.000Z",
        },
      ],
    }),
    runsResponse: apiSuccess("corr_icp_1", {
      runs: [
        {
          runId: "arun_1",
          workspaceId: "ws_1",
          ruleId: "rule_1",
          eventId: "evt_1",
          idempotencyKey: "rule_1:evt_1",
          status: "completed",
          attempts: 1,
          startedAt: "2026-02-07T10:00:00.000Z",
          completedAt: "2026-02-07T10:00:01.000Z",
        },
      ],
    }),
    ingestionResponse: apiSuccess("corr_icp_1", {
      records: [
        {
          sourceSystem: "stripe",
          sourceEventId: "evt_ext_1",
          eventType: "invoice.created",
          eventId: "evt_1",
          signatureVerified: true,
          receivedAt: "2026-02-07T10:00:00.000Z",
          ingestionStatus: "accepted",
          correlationId: "corr_icp_1",
          workspaceId: "ws_1",
        },
      ],
    }),
    deliveriesResponse: apiSuccess("corr_icp_1", {
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
          status: "delivered",
          queuedAt: "2026-02-07T10:00:00.000Z",
          updatedAt: "2026-02-07T10:00:02.000Z",
          completedAt: "2026-02-07T10:00:02.000Z",
        },
      ],
    }),
  };
}

test("buildIntegrationControlPlaneSummary maps healthy state", () => {
  const summary = buildIntegrationControlPlaneSummary(healthyInput());

  assert.equal(summary.status, "healthy");
  assert.equal(summary.connectorCount, 1);
  assert.equal(summary.deadLetterRunCount, 0);
  assert.equal(summary.deadLetterWebhookCount, 0);
});

test("buildIntegrationControlPlaneSummary maps degraded and critical states", () => {
  const degradedInput = healthyInput();
  degradedInput.connectorsResponse = apiSuccess("corr_icp_2", {
    connectors: [
      {
        connectorId: "conn_1",
        workspaceId: "ws_1",
        provider: "slack",
        authType: "oauth",
        credentialReference: "vault://x",
        status: "degraded",
        createdAt: "2026-02-07T09:00:00.000Z",
        updatedAt: "2026-02-07T10:00:00.000Z",
      },
    ],
  });

  const degradedSummary = buildIntegrationControlPlaneSummary(degradedInput);
  assert.equal(degradedSummary.status, "degraded");
  assert.equal(degradedSummary.degradedConnectorCount, 1);

  const criticalInput = healthyInput();
  criticalInput.deliveriesResponse = apiSuccess("corr_icp_3", {
    deliveries: [
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
        queuedAt: "2026-02-07T11:00:00.000Z",
        updatedAt: "2026-02-07T11:02:00.000Z",
        completedAt: "2026-02-07T11:02:00.000Z",
      },
    ],
  });

  const criticalSummary = buildIntegrationControlPlaneSummary(criticalInput);
  assert.equal(criticalSummary.status, "critical");
  assert.equal(criticalSummary.deadLetterWebhookCount, 1);
});

test("buildIntegrationControlPlaneSummary maps error when any source fails", () => {
  const erroredInput = healthyInput();
  erroredInput.ingestionResponse = apiError("corr_icp_4", "unavailable", "Ingestion down");

  const summary = buildIntegrationControlPlaneSummary(erroredInput);
  assert.equal(summary.status, "error");
});
