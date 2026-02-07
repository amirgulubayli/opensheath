import type {
  ApiResponse,
  CitationProvenance,
  ConfidenceBand,
  RetrievalResultItem,
} from "@ethoxford/contracts";

export interface EvidencePanelItem {
  id: string;
  title: string;
  sourceUri: string;
  excerptRange: string;
  scoreLabel: string;
  methodLabel: string;
  confidenceBand: ConfidenceBand;
}

export interface EvidencePanelState {
  status: "ready" | "empty" | "error";
  items: EvidencePanelItem[];
  message?: string;
}

export interface RetrievalQueryState {
  status: "ready" | "empty" | "error";
  results: EvidencePanelItem[];
  message?: string;
}

export interface CitationViewModel {
  citationId: string;
  responseSegmentId: string;
  evidenceType: string;
  confidenceBand: ConfidenceBand;
  confidencePercent: number;
}

function scoreToBand(score: number): ConfidenceBand {
  if (score >= 0.8) {
    return "high";
  }

  if (score >= 0.5) {
    return "medium";
  }

  return "low";
}

function formatRange(start: number, end: number): string {
  return `${start}-${end}`;
}

function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

function formatMethod(method: RetrievalResultItem["retrievalMethod"]): string {
  switch (method) {
    case "semantic":
      return "Semantic";
    case "keyword":
      return "Keyword";
    case "hybrid":
    default:
      return "Hybrid";
  }
}

export function mapRetrievalResultsToEvidencePanel(
  response: ApiResponse<{ results: RetrievalResultItem[] }>,
): EvidencePanelState {
  if (!response.ok) {
    return {
      status: "error",
      items: [],
      message: "Unable to load retrieval evidence.",
    };
  }

  if (response.data.results.length === 0) {
    return {
      status: "empty",
      items: [],
      message: "No evidence was found for this query.",
    };
  }

  return {
    status: "ready",
    items: response.data.results.map((result) => ({
      id: result.chunkId,
      title: result.sourceTitle,
      sourceUri: result.sourceUri,
      excerptRange: formatRange(result.chunkStartOffset, result.chunkEndOffset),
      scoreLabel: formatScore(result.retrievalScore),
      methodLabel: formatMethod(result.retrievalMethod),
      confidenceBand: scoreToBand(result.retrievalScore),
    })),
  };
}

export function mapRetrievalQueryToState(
  response: ApiResponse<{ results: RetrievalResultItem[] }>,
): RetrievalQueryState {
  const panel = mapRetrievalResultsToEvidencePanel(response);

  return {
    status: panel.status,
    results: panel.items,
    ...(panel.message ? { message: panel.message } : {}),
  };
}

export function mapCitationsToViewModel(
  response: ApiResponse<{ citations: CitationProvenance[] }>,
): CitationViewModel[] {
  if (!response.ok) {
    return [];
  }

  return response.data.citations.map((citation) => ({
    citationId: citation.citationId,
    responseSegmentId: citation.responseSegmentId,
    evidenceType: citation.evidenceType,
    confidenceBand: citation.confidenceBand,
    confidencePercent: Math.round(citation.confidenceScore * 100),
  }));
}

