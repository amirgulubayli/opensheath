import assert from "node:assert/strict";
import test from "node:test";

import { apiError, apiSuccess } from "@ethoxford/contracts";

import {
  mapAutomationRulesToState,
  mapAutomationRunsToState,
  mapConnectorsToDashboard,
  mapEventIngestionToState,
  mapPublishEventResponse,
} from "./integration-automation-adapter.js";

test("mapConnectorsToDashboard maps connector lifecycle states", () => {
  const state = mapConnectorsToDashboard(
    apiSuccess("corr_conn", {
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
          lastErrorMessage: "timeout",
        },
        {
          connectorId: "conn_2",
          workspaceId: "ws_1",
          provider: "github",
          authType: "api_key",
          credentialReference: "vault://y",
          status: "connected",
          createdAt: "2026-02-07T08:00:00.000Z",
          updatedAt: "2026-02-07T11:00:00.000Z",
        },
      ],
    }),
  );

  assert.equal(state.status, "ready");
  assert.equal(state.connectors.length, 2);
  assert.equal(state.connectors[0]?.connectorId, "conn_2");
  assert.equal(state.connectors[1]?.statusLabel, "Degraded");
  assert.equal(state.connectors[1]?.lastErrorMessage, "timeout");
});

test("mapAutomationRulesToState returns empty state for missing rules", () => {
  const state = mapAutomationRulesToState(
    apiSuccess("corr_rules", {
      rules: [],
    }),
  );

  assert.equal(state.status, "empty");
  assert.equal(state.rules.length, 0);
});

test("mapAutomationRunsToState maps dead-letter run history", () => {
  const state = mapAutomationRunsToState(
    apiSuccess("corr_runs", {
      runs: [
        {
          runId: "arun_1",
          workspaceId: "ws_1",
          ruleId: "rule_1",
          eventId: "evt_1",
          idempotencyKey: "rule_1:evt_1",
          status: "completed",
          attempts: 1,
          startedAt: "2026-02-07T09:00:00.000Z",
          completedAt: "2026-02-07T09:01:00.000Z",
        },
        {
          runId: "arun_2",
          workspaceId: "ws_1",
          ruleId: "rule_2",
          eventId: "evt_2",
          idempotencyKey: "rule_2:evt_2",
          status: "dead_letter",
          attempts: 3,
          startedAt: "2026-02-07T10:00:00.000Z",
          completedAt: "2026-02-07T10:01:00.000Z",
          lastError: "timeout",
        },
      ],
    }),
  );

  assert.equal(state.status, "ready");
  assert.equal(state.runs.length, 2);
  assert.equal(state.runs[0]?.runId, "arun_2");
  assert.equal(state.runs[0]?.statusLabel, "Dead Letter");
  assert.equal(state.runs[0]?.lastError, "timeout");
});

test("mapEventIngestionToState maps accepted and rejected statuses", () => {
  const state = mapEventIngestionToState(
    apiSuccess("corr_ingest", {
      records: [
        {
          sourceSystem: "stripe",
          sourceEventId: "evt_ext_1",
          eventType: "invoice.created",
          eventId: "evt_1",
          signatureVerified: true,
          receivedAt: "2026-02-07T10:00:00.000Z",
          ingestionStatus: "accepted",
          correlationId: "corr_1",
          workspaceId: "ws_1",
        },
        {
          sourceSystem: "stripe",
          sourceEventId: "evt_ext_2",
          eventType: "invoice.created",
          eventId: "evt_2",
          signatureVerified: false,
          receivedAt: "2026-02-07T10:05:00.000Z",
          ingestionStatus: "rejected_signature",
          correlationId: "corr_2",
          workspaceId: "ws_1",
        },
      ],
    }),
  );

  assert.equal(state.status, "ready");
  assert.equal(state.records.length, 2);
  assert.equal(state.records[0]?.eventId, "evt_2");
  assert.equal(state.records[0]?.ingestionLabel, "Rejected Signature");
  assert.equal(state.records[1]?.ingestionLabel, "Accepted");
});

test("mapPublishEventResponse maps accepted and duplicate outcomes", () => {
  const accepted = mapPublishEventResponse(
    apiSuccess("corr_publish", {
      accepted: true,
      eventId: "evt_1",
    }),
  );

  assert.equal(accepted.status, "accepted");
  assert.equal(accepted.retryable, false);

  const duplicate = mapPublishEventResponse(
    apiSuccess("corr_publish_2", {
      accepted: false,
      eventId: "evt_1",
    }),
  );

  assert.equal(duplicate.status, "duplicate_or_rejected");
  assert.equal(duplicate.retryable, false);
});

test("mapPublishEventResponse maps API errors to retryable/non-retryable", () => {
  const retryable = mapPublishEventResponse(
    apiError("corr_publish_3", "unavailable", "Service unavailable"),
  );
  assert.equal(retryable.status, "error");
  assert.equal(retryable.retryable, true);

  const nonRetryable = mapPublishEventResponse(
    apiError("corr_publish_4", "validation_denied", "Invalid payload"),
  );
  assert.equal(nonRetryable.status, "error");
  assert.equal(nonRetryable.retryable, false);
});
