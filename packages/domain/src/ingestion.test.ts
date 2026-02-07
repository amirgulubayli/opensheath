import assert from "node:assert/strict";
import test from "node:test";

import { DomainError, InMemoryIngestionService, type RequestContext } from "./index.js";

const context: RequestContext = {
  correlationId: "corr_ingest",
  actorId: "user_1",
  workspaceId: "ws_1",
  roles: ["member"],
};

test("ingestion service uses retrying and dead-letter states with retry budget", () => {
  const service = new InMemoryIngestionService(2);

  const document = service.createDocument(context, {
    name: "Guide",
    source: "upload.pdf",
  });

  service.markProcessing(context, document.documentId);
  let failed = service.markFailed(
    context,
    document.documentId,
    "parse_error",
    "validation_error",
  );
  assert.equal(failed.status, "failed");

  const retrying = service.retry(context, document.documentId);
  assert.equal(retrying.status, "retrying");

  service.markProcessing(context, document.documentId);
  failed = service.markFailed(
    context,
    document.documentId,
    "parse_error_again",
    "validation_error",
  );
  assert.equal(failed.status, "failed");

  service.retry(context, document.documentId);
  service.markProcessing(context, document.documentId);
  const dead = service.markFailed(
    context,
    document.documentId,
    "parse_error_final",
    "validation_error",
  );
  assert.equal(dead.status, "dead_letter");
});

test("dead-lettered job requires explicit replay to retry", () => {
  const service = new InMemoryIngestionService(0);
  const document = service.createDocument(context, {
    name: "Broken",
    source: "broken.pdf",
  });

  service.markProcessing(context, document.documentId);
  const dead = service.markFailed(context, document.documentId, "fatal");
  assert.equal(dead.status, "dead_letter");

  assert.throws(
    () => service.retry(context, document.documentId),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.code, "unavailable");
      return true;
    },
  );

  const replay = service.retry(context, document.documentId, {
    replayDeadLetter: true,
    correlationId: "corr_replay",
  });
  assert.equal(replay.status, "retrying");

  const job = service.getJob(document.documentId);
  assert.equal(job.retryCount, 0);
  assert.equal(job.correlationId, "corr_replay");
});

test("ingestion service records activity timeline", () => {
  const service = new InMemoryIngestionService(1);
  const document = service.createDocument(context, {
    name: "Timeline",
    source: "timeline.pdf",
  });

  service.markProcessing(context, document.documentId);
  service.markCompleted(context, document.documentId, 3);

  const events = service.getActivity(context, document.documentId);
  assert.equal(events.length, 3);
  assert.equal(events[0]?.eventType, "document.created");
  assert.equal(events[2]?.eventType, "document.completed");
});
