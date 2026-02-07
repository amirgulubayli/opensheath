import assert from "node:assert/strict";
import test from "node:test";

import { apiError, apiSuccess, type CitationProvenance } from "@ethoxford/contracts";

import {
  mapCitationsToViewModel,
  mapRetrievalQueryToState,
  mapRetrievalResultsToEvidencePanel,
} from "./retrieval-adapter.js";

test("mapRetrievalResultsToEvidencePanel maps retrieval payload to evidence items", () => {
  const state = mapRetrievalResultsToEvidencePanel(
    apiSuccess("corr_retrieval", {
      results: [
        {
          workspaceId: "ws_1",
          documentId: "doc_1",
          chunkId: "chk_1",
          sourceUri: "file://policy",
          sourceTitle: "Policy",
          chunkStartOffset: 12,
          chunkEndOffset: 88,
          retrievalScore: 0.84,
          retrievalRank: 1,
          retrievalMethod: "hybrid",
          embeddingModelVersion: "embed_v1",
          indexedAt: new Date().toISOString(),
          correlationId: "corr_retrieval",
        },
      ],
    }),
  );

  assert.equal(state.status, "ready");
  assert.deepEqual(state.items[0], {
    id: "chk_1",
    title: "Policy",
    sourceUri: "file://policy",
    excerptRange: "12-88",
    scoreLabel: "84%",
    methodLabel: "Hybrid",
    confidenceBand: "high",
  });
});

test("mapRetrievalResultsToEvidencePanel returns empty state when no results", () => {
  const state = mapRetrievalResultsToEvidencePanel(
    apiSuccess("corr_retrieval_empty", {
      results: [],
    }),
  );

  assert.deepEqual(state, {
    status: "empty",
    items: [],
    message: "No evidence was found for this query.",
  });
});

test("mapRetrievalQueryToState maps results into query state", () => {
  const state = mapRetrievalQueryToState(
    apiSuccess("corr_retrieval_query", {
      results: [
        {
          workspaceId: "ws_1",
          documentId: "doc_1",
          chunkId: "chk_2",
          sourceUri: "file://plan",
          sourceTitle: "Plan",
          chunkStartOffset: 4,
          chunkEndOffset: 42,
          retrievalScore: 0.62,
          retrievalRank: 1,
          retrievalMethod: "semantic",
          embeddingModelVersion: "embed_v1",
          indexedAt: new Date().toISOString(),
          correlationId: "corr_retrieval_query",
        },
      ],
    }),
  );

  assert.equal(state.status, "ready");
  assert.equal(state.results[0]?.methodLabel, "Semantic");
});

test("mapRetrievalResultsToEvidencePanel maps errors to error state", () => {
  const state = mapRetrievalResultsToEvidencePanel(
    apiError("corr_retrieval_error", "unavailable", "Downstream unavailable"),
  );

  assert.deepEqual(state, {
    status: "error",
    items: [],
    message: "Unable to load retrieval evidence.",
  });
});

test("mapCitationsToViewModel maps citation payload", () => {
  const citations: CitationProvenance[] = [
    {
      citationId: "cite_1",
      agentRunId: "run_1",
      responseSegmentId: "seg_1",
      documentId: "doc_1",
      chunkId: "chk_1",
      evidenceType: "supporting",
      confidenceScore: 0.67,
      confidenceBand: "medium",
      workspaceId: "ws_1",
    },
  ];

  const viewModels = mapCitationsToViewModel(
    apiSuccess("corr_citations", { citations }),
  );

  assert.deepEqual(viewModels, [
    {
      citationId: "cite_1",
      responseSegmentId: "seg_1",
      evidenceType: "supporting",
      confidenceBand: "medium",
      confidencePercent: 67,
    },
  ]);
});

test("mapCitationsToViewModel returns empty list on error", () => {
  const viewModels = mapCitationsToViewModel(
    apiError("corr_citations_error", "internal_error", "Unexpected"),
  );

  assert.deepEqual(viewModels, []);
});

