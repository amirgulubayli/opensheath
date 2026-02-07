import assert from "node:assert/strict";
import test from "node:test";

import { apiError, apiSuccess } from "@ethoxford/contracts";

import {
  mapIngestionCreateResponse,
  mapIngestionCompleteResponse,
  mapIngestionFailResponse,
  mapIngestionProcessingResponse,
  mapIngestionRetryResponse,
} from "./ingestion-adapter.js";

test("mapIngestionCreateResponse maps queued document", () => {
  const state = mapIngestionCreateResponse(
    apiSuccess("corr_ingest", {
      document: {
        documentId: "doc_1",
        workspaceId: "ws_1",
        name: "Spec",
        source: "spec.pdf",
        status: "queued",
        createdAt: "2026-02-07T08:00:00.000Z",
        updatedAt: "2026-02-07T08:00:00.000Z",
      },
    }),
  );

  assert.equal(state.status, "created");
  assert.equal(state.document?.statusLabel, "Queued");
  assert.equal(state.retryable, false);
});

test("mapIngestionFailResponse marks dead letter message", () => {
  const state = mapIngestionFailResponse(
    apiSuccess("corr_ingest_fail", {
      document: {
        documentId: "doc_2",
        workspaceId: "ws_1",
        name: "Spec",
        source: "spec.pdf",
        status: "dead_letter",
        createdAt: "2026-02-07T08:00:00.000Z",
        updatedAt: "2026-02-07T08:12:00.000Z",
      },
    }),
  );

  assert.equal(state.status, "updated");
  assert.equal(state.message, "Document moved to dead letter.");
  assert.equal(state.document?.replayRequired, true);
});

test("mapIngestionRetryResponse returns error on validation", () => {
  const state = mapIngestionRetryResponse(
    apiError("corr_ingest_retry", "validation_denied", "Missing documentId"),
  );

  assert.equal(state.status, "error");
  assert.equal(state.retryable, false);
});

test("mapIngestionProcessingResponse maps processing status", () => {
  const state = mapIngestionProcessingResponse(
    apiSuccess("corr_ingest_processing", {
      document: {
        documentId: "doc_3",
        workspaceId: "ws_1",
        name: "Spec",
        source: "spec.pdf",
        status: "processing",
        createdAt: "2026-02-07T08:00:00.000Z",
        updatedAt: "2026-02-07T08:05:00.000Z",
      },
    }),
  );

  assert.equal(state.status, "updated");
  assert.equal(state.document?.statusLabel, "Processing");
});

test("mapIngestionCompleteResponse maps completion status", () => {
  const state = mapIngestionCompleteResponse(
    apiSuccess("corr_ingest_complete", {
      document: {
        documentId: "doc_4",
        workspaceId: "ws_1",
        name: "Spec",
        source: "spec.pdf",
        status: "completed",
        createdAt: "2026-02-07T08:00:00.000Z",
        updatedAt: "2026-02-07T08:15:00.000Z",
      },
    }),
  );

  assert.equal(state.status, "updated");
  assert.equal(state.document?.statusLabel, "Completed");
});
