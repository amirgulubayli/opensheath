import { randomUUID } from "node:crypto";

import { createEventEnvelope, type DocumentEvent } from "@ethoxford/contracts";

import { DomainError, ensureWorkspaceContext, type RequestContext } from "./shared.js";

export type IngestionStatus =
  | "queued"
  | "processing"
  | "retrying"
  | "failed"
  | "completed"
  | "dead_letter";

export interface DocumentAsset {
  documentId: string;
  workspaceId: string;
  name: string;
  source: string;
  status: IngestionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IngestionJob {
  documentId: string;
  attemptCount: number;
  retryCount: number;
  maxRetries: number;
  correlationId: string;
  idempotencyKey: string;
  queuedAt: string;
  startedAt?: string | undefined;
  completedAt?: string | undefined;
  nextRetryAt?: string | undefined;
  lastErrorClass?: string | undefined;
  lastErrorMessage?: string | undefined;
  chunkCount?: number | undefined;
}

export class InMemoryIngestionService {
  private readonly documents = new Map<string, DocumentAsset>();
  private readonly jobs = new Map<string, IngestionJob>();
  private readonly eventsByDocument = new Map<string, DocumentEvent[]>();

  constructor(private readonly maxRetries = 3) {}

  createDocument(
    context: RequestContext,
    input: {
      name: string;
      source: string;
    },
  ): DocumentAsset {
    const workspaceId = ensureWorkspaceContext(context);

    if (!input.name.trim() || !input.source.trim()) {
      throw new DomainError("validation_denied", "name and source are required", {
        field: "name,source",
      });
    }

    const now = new Date().toISOString();
    const document: DocumentAsset = {
      documentId: `doc_${randomUUID()}`,
      workspaceId,
      name: input.name,
      source: input.source,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    };

    const job: IngestionJob = {
      documentId: document.documentId,
      attemptCount: 0,
      retryCount: 0,
      maxRetries: this.maxRetries,
      correlationId: context.correlationId,
      idempotencyKey: this.newIdempotencyKey(document.documentId),
      queuedAt: now,
    };

    this.documents.set(document.documentId, document);
    this.jobs.set(document.documentId, job);
    this.recordEvent(context, "document.created", document);

    return document;
  }

  markProcessing(context: RequestContext, documentId: string): DocumentAsset {
    const document = this.requireDocumentInContext(context, documentId);

    if (document.status !== "queued" && document.status !== "retrying") {
      throw new DomainError("conflict", "Document is not ready for processing", {
        documentId,
        status: document.status,
      });
    }

    const job = this.requireJob(documentId);
    const now = new Date().toISOString();
    const nextJob: IngestionJob = {
      documentId: job.documentId,
      attemptCount: job.attemptCount + 1,
      retryCount: job.retryCount,
      maxRetries: job.maxRetries,
      correlationId: job.correlationId,
      idempotencyKey: job.idempotencyKey,
      queuedAt: job.queuedAt,
      startedAt: now,
      ...(job.completedAt !== undefined ? { completedAt: job.completedAt } : {}),
      ...(job.lastErrorClass !== undefined ? { lastErrorClass: job.lastErrorClass } : {}),
      ...(job.lastErrorMessage !== undefined ? { lastErrorMessage: job.lastErrorMessage } : {}),
      ...(job.chunkCount !== undefined ? { chunkCount: job.chunkCount } : {}),
    };

    this.jobs.set(documentId, nextJob);
    const updated = this.updateStatus(context, documentId, "processing");
    this.recordEvent(context, "document.processing", updated);
    return updated;
  }

  markCompleted(
    context: RequestContext,
    documentId: string,
    chunkCount: number,
  ): DocumentAsset {
    const current = this.requireDocumentInContext(context, documentId);
    if (current.status !== "processing") {
      throw new DomainError("conflict", "Only processing documents can complete", {
        documentId,
        status: current.status,
      });
    }

    const document = this.updateStatus(context, documentId, "completed");
    const job = this.requireJob(documentId);
    const now = new Date().toISOString();
    const nextJob: IngestionJob = {
      documentId: job.documentId,
      attemptCount: job.attemptCount,
      retryCount: job.retryCount,
      maxRetries: job.maxRetries,
      correlationId: job.correlationId,
      idempotencyKey: job.idempotencyKey,
      queuedAt: job.queuedAt,
      completedAt: now,
      chunkCount,
      ...(job.startedAt !== undefined ? { startedAt: job.startedAt } : {}),
    };
    this.jobs.set(documentId, nextJob);
    this.recordEvent(context, "document.completed", document);

    return document;
  }

  markFailed(
    context: RequestContext,
    documentId: string,
    errorMessage: string,
    errorClass = "unexpected_internal",
  ): DocumentAsset {
    const document = this.requireDocumentInContext(context, documentId);
    if (document.status !== "processing") {
      throw new DomainError("conflict", "Only processing documents can fail", {
        documentId,
        status: document.status,
      });
    }

    const job = this.requireJob(documentId);
    const retryCount = job.retryCount + 1;
    const nextStatus: IngestionStatus =
      retryCount > job.maxRetries ? "dead_letter" : "failed";
    const now = new Date().toISOString();
    const nextRetryAt =
      nextStatus === "failed"
        ? new Date(Date.now() + 1000 * 5 * retryCount).toISOString()
        : undefined;

    const updated: DocumentAsset = {
      ...document,
      status: nextStatus,
      updatedAt: now,
    };

    this.documents.set(documentId, updated);
    const nextJob: IngestionJob = {
      documentId: job.documentId,
      attemptCount: job.attemptCount,
      retryCount,
      maxRetries: job.maxRetries,
      correlationId: job.correlationId,
      idempotencyKey: job.idempotencyKey,
      queuedAt: job.queuedAt,
      lastErrorClass: errorClass,
      lastErrorMessage: this.sanitizeError(errorMessage),
      ...(job.startedAt !== undefined ? { startedAt: job.startedAt } : {}),
      ...(job.chunkCount !== undefined ? { chunkCount: job.chunkCount } : {}),
      ...(nextStatus === "dead_letter" ? { completedAt: now } : {}),
      ...(nextRetryAt !== undefined ? { nextRetryAt } : {}),
    };

    this.jobs.set(documentId, nextJob);
    this.recordEvent(
      context,
      nextStatus === "dead_letter" ? "document.dead_letter" : "document.failed",
      updated,
    );

    return updated;
  }

  retry(
    context: RequestContext,
    documentId: string,
    options?: {
      replayDeadLetter?: boolean;
      correlationId?: string;
    },
  ): DocumentAsset {
    const document = this.requireDocumentInContext(context, documentId);
    const job = this.requireJob(documentId);

    if (document.status === "dead_letter" && !options?.replayDeadLetter) {
      throw new DomainError("unavailable", "Document is dead-lettered; replay required", {
        documentId,
      });
    }

    if (document.status !== "failed" && document.status !== "dead_letter") {
      throw new DomainError("conflict", "Document is not retryable", {
        documentId,
        status: document.status,
      });
    }

    const isReplay = document.status === "dead_letter";
    if (!isReplay && job.retryCount > job.maxRetries) {
      throw new DomainError("unavailable", "Retry limit exceeded", {
        documentId,
      });
    }

    const now = new Date().toISOString();
    const nextJob: IngestionJob = {
      documentId: job.documentId,
      attemptCount: isReplay ? 0 : job.attemptCount,
      retryCount: isReplay ? 0 : job.retryCount,
      maxRetries: job.maxRetries,
      correlationId: options?.correlationId ?? job.correlationId,
      idempotencyKey: this.newIdempotencyKey(documentId),
      queuedAt: now,
    };

    this.jobs.set(documentId, nextJob);
    const updated = this.updateStatus(context, documentId, "retrying");
    this.recordEvent(context, "document.retrying", updated);
    return updated;
  }

  listByWorkspace(workspaceId: string): DocumentAsset[] {
    return [...this.documents.values()].filter(
      (document) => document.workspaceId === workspaceId,
    );
  }

  getJob(documentId: string): IngestionJob {
    return this.requireJob(documentId);
  }

  getActivity(context: RequestContext, documentId: string): DocumentEvent[] {
    const document = this.requireDocumentInContext(context, documentId);
    return this.eventsByDocument.get(document.documentId) ?? [];
  }

  private updateStatus(
    context: RequestContext,
    documentId: string,
    status: IngestionStatus,
  ): DocumentAsset {
    const document = this.requireDocumentInContext(context, documentId);

    const updated: DocumentAsset = {
      ...document,
      status,
      updatedAt: new Date().toISOString(),
    };

    this.documents.set(documentId, updated);
    return updated;
  }

  private newIdempotencyKey(documentId: string): string {
    return `ingest_${documentId}_${randomUUID()}`;
  }

  private sanitizeError(message: string): string {
    return message.trim().slice(0, 500);
  }

  private requireDocument(documentId: string): DocumentAsset {
    const document = this.documents.get(documentId);

    if (!document) {
      throw new DomainError("not_found", "Document not found", {
        documentId,
      });
    }

    return document;
  }

  private requireDocumentInContext(
    context: RequestContext,
    documentId: string,
  ): DocumentAsset {
    const workspaceId = ensureWorkspaceContext(context);
    const document = this.requireDocument(documentId);

    if (document.workspaceId !== workspaceId) {
      throw new DomainError("not_found", "Document not found", {
        documentId,
      });
    }

    return document;
  }

  private requireJob(documentId: string): IngestionJob {
    const job = this.jobs.get(documentId);

    if (!job) {
      throw new DomainError("not_found", "Ingestion job not found", {
        documentId,
      });
    }

    return job;
  }

  private recordEvent(
    context: RequestContext,
    eventType:
      | "document.created"
      | "document.processing"
      | "document.retrying"
      | "document.failed"
      | "document.completed"
      | "document.dead_letter",
    document: DocumentAsset,
  ): void {
    const eventOptions: {
      eventId: string;
      correlationId: string;
      workspaceId: string;
      actorId?: string;
    } = {
      eventId: `evt_${randomUUID()}`,
      correlationId: context.correlationId,
      workspaceId: document.workspaceId,
    };

    if (context.actorId !== undefined) {
      eventOptions.actorId = context.actorId;
    }

    const event = createEventEnvelope(
      eventType,
      {
        documentId: document.documentId,
        workspaceId: document.workspaceId,
        status: document.status,
      },
      eventOptions,
    );

    const existing = this.eventsByDocument.get(document.documentId) ?? [];
    this.eventsByDocument.set(document.documentId, existing.concat(event));
  }
}
