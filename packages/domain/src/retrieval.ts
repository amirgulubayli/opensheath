import { randomUUID } from "node:crypto";

import type {
  CitationProvenance,
  ConfidenceBand,
  EvidenceType,
  RetrievalMethod,
  RetrievalResultItem,
} from "@ethoxford/contracts";

import { DomainError, ensureWorkspaceContext, type RequestContext } from "./shared.js";

export function isEvidenceType(value: string): value is EvidenceType {
  return value === "direct" || value === "supporting" || value === "inferred";
}

export function isConfidenceBand(value: string): value is ConfidenceBand {
  return value === "high" || value === "medium" || value === "low";
}

interface IndexedChunk {
  chunkId: string;
  workspaceId: string;
  documentId: string;
  sourceUri: string;
  sourceTitle: string;
  text: string;
  chunkStartOffset: number;
  chunkEndOffset: number;
  embeddingModelVersion: string;
  indexedAt: string;
}

interface CitationRecord extends CitationProvenance {
  createdAt: string;
}

export class InMemoryRetrievalService {
  private readonly chunks = new Map<string, IndexedChunk>();
  private readonly citations = new Map<string, CitationRecord>();

  indexChunks(
    context: RequestContext,
    input: {
      documentId: string;
      sourceUri: string;
      sourceTitle: string;
      embeddingModelVersion: string;
      chunks: Array<{
        text: string;
        chunkStartOffset: number;
        chunkEndOffset: number;
        indexedAt?: string;
        chunkId?: string;
      }>;
    },
  ): IndexedChunk[] {
    const workspaceId = ensureWorkspaceContext(context);

    if (!input.documentId.trim()) {
      throw new DomainError("validation_denied", "documentId is required", {
        field: "documentId",
      });
    }

    if (input.chunks.length === 0) {
      throw new DomainError("validation_denied", "chunks are required", {
        field: "chunks",
      });
    }

    return input.chunks.map((chunk) => {
      if (!chunk.text.trim()) {
        throw new DomainError("validation_denied", "chunk text is required", {
          field: "chunks.text",
        });
      }

      const indexed: IndexedChunk = {
        chunkId: chunk.chunkId ?? `chk_${randomUUID()}`,
        workspaceId,
        documentId: input.documentId,
        sourceUri: input.sourceUri,
        sourceTitle: input.sourceTitle,
        text: chunk.text,
        chunkStartOffset: chunk.chunkStartOffset,
        chunkEndOffset: chunk.chunkEndOffset,
        embeddingModelVersion: input.embeddingModelVersion,
        indexedAt: chunk.indexedAt ?? new Date().toISOString(),
      };

      this.chunks.set(indexed.chunkId, indexed);
      return indexed;
    });
  }

  query(
    context: RequestContext,
    input: {
      query: string;
      method?: RetrievalMethod;
      limit?: number;
      minScore?: number;
    },
  ): RetrievalResultItem[] {
    const workspaceId = ensureWorkspaceContext(context);

    if (!input.query.trim()) {
      throw new DomainError("validation_denied", "query is required", {
        field: "query",
      });
    }

    const method: RetrievalMethod = input.method ?? "hybrid";
    const limit = input.limit ?? 5;
    const minScore = input.minScore ?? 0;
    const queryTokens = input.query
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 0);

    const scored = [...this.chunks.values()]
      .filter((chunk) => chunk.workspaceId === workspaceId)
      .map((chunk) => {
        const text = chunk.text.toLowerCase();
        const matches = queryTokens.filter((token) => text.includes(token)).length;
        const rawScore = queryTokens.length > 0 ? matches / queryTokens.length : 0;
        const retrievalScore = Number(rawScore.toFixed(3));

        return {
          chunk,
          retrievalScore,
        };
      })
      .filter((candidate) => candidate.retrievalScore >= minScore)
      .sort((a, b) => b.retrievalScore - a.retrievalScore)
      .slice(0, Math.max(1, limit));

    return scored.map((candidate, index) => ({
      workspaceId: candidate.chunk.workspaceId,
      documentId: candidate.chunk.documentId,
      chunkId: candidate.chunk.chunkId,
      sourceUri: candidate.chunk.sourceUri,
      sourceTitle: candidate.chunk.sourceTitle,
      chunkStartOffset: candidate.chunk.chunkStartOffset,
      chunkEndOffset: candidate.chunk.chunkEndOffset,
      retrievalScore: candidate.retrievalScore,
      retrievalRank: index + 1,
      retrievalMethod: method,
      embeddingModelVersion: candidate.chunk.embeddingModelVersion,
      indexedAt: candidate.chunk.indexedAt,
      correlationId: context.correlationId,
    }));
  }

  recordCitation(
    context: RequestContext,
    input: {
      agentRunId: string;
      responseSegmentId: string;
      documentId: string;
      chunkId: string;
      evidenceType: EvidenceType;
      confidenceScore: number;
      citationId?: string;
      confidenceBand?: ConfidenceBand;
    },
  ): CitationProvenance {
    const workspaceId = ensureWorkspaceContext(context);
    const chunk = this.chunks.get(input.chunkId);

    if (!chunk || chunk.workspaceId !== workspaceId) {
      throw new DomainError("not_found", "Chunk not found in workspace", {
        chunkId: input.chunkId,
      });
    }

    const normalizedScore = Math.max(0, Math.min(1, input.confidenceScore));
    const confidenceBand =
      input.confidenceBand ?? this.scoreToBand(normalizedScore);

    const citation: CitationRecord = {
      citationId: input.citationId ?? `cite_${randomUUID()}`,
      agentRunId: input.agentRunId,
      responseSegmentId: input.responseSegmentId,
      documentId: input.documentId,
      chunkId: input.chunkId,
      evidenceType: input.evidenceType,
      confidenceScore: normalizedScore,
      confidenceBand,
      workspaceId,
      createdAt: new Date().toISOString(),
    };

    this.citations.set(citation.citationId, citation);
    return citation;
  }

  listCitations(context: RequestContext, agentRunId?: string): CitationProvenance[] {
    const workspaceId = ensureWorkspaceContext(context);

    return [...this.citations.values()]
      .filter((citation) => citation.workspaceId === workspaceId)
      .filter((citation) => (agentRunId ? citation.agentRunId === agentRunId : true))
      .map((citation) => ({
        citationId: citation.citationId,
        agentRunId: citation.agentRunId,
        responseSegmentId: citation.responseSegmentId,
        documentId: citation.documentId,
        chunkId: citation.chunkId,
        evidenceType: citation.evidenceType,
        confidenceScore: citation.confidenceScore,
        confidenceBand: citation.confidenceBand,
        workspaceId: citation.workspaceId,
      }));
  }

  addChunk(
    context: RequestContext,
    input: {
      documentId: string;
      sourceUri: string;
      sourceTitle: string;
      content: string;
      embeddingModelVersion: string;
    },
  ): IndexedChunk {
    const indexed = this.indexChunks(context, {
      documentId: input.documentId,
      sourceUri: input.sourceUri,
      sourceTitle: input.sourceTitle,
      embeddingModelVersion: input.embeddingModelVersion,
      chunks: [
        {
          text: input.content,
          chunkStartOffset: 0,
          chunkEndOffset: Math.max(0, input.content.length - 1),
        },
      ],
    });

    return indexed[0]!;
  }

  buildCitations(
    context: RequestContext,
    input: {
      agentRunId: string;
      responseSegmentId: string;
      results: RetrievalResultItem[];
    },
  ): CitationProvenance[] {
    return input.results.map((result) =>
      this.recordCitation(context, {
        agentRunId: input.agentRunId,
        responseSegmentId: input.responseSegmentId,
        documentId: result.documentId,
        chunkId: result.chunkId,
        evidenceType: "supporting",
        confidenceScore: result.retrievalScore,
      }),
    );
  }

  private scoreToBand(score: number): ConfidenceBand {
    if (score >= 0.8) {
      return "high";
    }

    if (score >= 0.5) {
      return "medium";
    }

    return "low";
  }
}
