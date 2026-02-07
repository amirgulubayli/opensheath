import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryRetrievalService, type RequestContext } from "./index.js";

const ws1Context: RequestContext = {
  correlationId: "corr_ws1",
  workspaceId: "ws_1",
  actorId: "user_1",
  roles: ["member"],
};

const ws2Context: RequestContext = {
  correlationId: "corr_ws2",
  workspaceId: "ws_2",
  actorId: "user_2",
  roles: ["member"],
};

test("retrieval query is tenant-scoped and ranked", () => {
  const service = new InMemoryRetrievalService();

  service.addChunk(ws1Context, {
    documentId: "doc_1",
    sourceUri: "file://policy",
    sourceTitle: "Policy",
    content: "Workspace one policy requires confirmation for billing changes",
    embeddingModelVersion: "embed_v1",
  });

  service.addChunk(ws2Context, {
    documentId: "doc_2",
    sourceUri: "file://other",
    sourceTitle: "Other",
    content: "Workspace two secret content",
    embeddingModelVersion: "embed_v1",
  });

  const results = service.query(ws1Context, {
    query: "confirmation billing",
    method: "hybrid",
  });

  assert.equal(results.length, 1);
  assert.equal(results[0]?.workspaceId, "ws_1");
  assert.equal(results[0]?.retrievalRank, 1);
  assert.equal(results[0]?.retrievalMethod, "hybrid");
  assert.equal(results[0]?.correlationId, "corr_ws1");
});

test("citation provenance payload uses retrieval confidence", () => {
  const service = new InMemoryRetrievalService();
  const chunk = service.addChunk(ws1Context, {
    documentId: "doc_1",
    sourceUri: "file://policy",
    sourceTitle: "Policy",
    content: "policy billing confirmation",
    embeddingModelVersion: "embed_v1",
  });

  const citations = service.buildCitations(ws1Context, {
    agentRunId: "run_1",
    responseSegmentId: "seg_1",
    results: [
      {
        workspaceId: "ws_1",
        documentId: "doc_1",
        chunkId: chunk.chunkId,
        sourceUri: "file://policy",
        sourceTitle: "Policy",
        chunkStartOffset: 0,
        chunkEndOffset: 10,
        retrievalScore: 0.9,
        retrievalRank: 1,
        retrievalMethod: "hybrid",
        embeddingModelVersion: "embed_v1",
        indexedAt: new Date().toISOString(),
        correlationId: "corr_ws1",
      },
    ],
  });

  assert.equal(citations.length, 1);
  assert.equal(citations[0]?.workspaceId, "ws_1");
  assert.equal(citations[0]?.confidenceBand, "high");
  assert.equal(citations[0]?.agentRunId, "run_1");
});
