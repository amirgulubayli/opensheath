import type { ApiResponse, DocumentAsset } from "@ethoxford/contracts";

export interface DocumentIngestionViewModel {
  documentId: string;
  name: string;
  source: string;
  status: DocumentAsset["status"];
  statusLabel: string;
  updatedAt: string;
  retryEligible: boolean;
  replayRequired: boolean;
}

export interface IngestionActionState {
  status: "created" | "updated" | "error";
  document?: DocumentIngestionViewModel;
  message: string;
  retryable: boolean;
}

function statusLabel(status: DocumentAsset["status"]): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "processing":
      return "Processing";
    case "retrying":
      return "Retrying";
    case "failed":
      return "Failed";
    case "completed":
      return "Completed";
    case "dead_letter":
    default:
      return "Dead Letter";
  }
}

function mapDocument(document: DocumentAsset): DocumentIngestionViewModel {
  const replayRequired = document.status === "dead_letter";
  const retryEligible = document.status === "failed" || document.status === "dead_letter";

  return {
    documentId: document.documentId,
    name: document.name,
    source: document.source,
    status: document.status,
    statusLabel: statusLabel(document.status),
    updatedAt: document.updatedAt,
    retryEligible,
    replayRequired,
  };
}

export function mapIngestionCreateResponse(
  response: ApiResponse<{ document: DocumentAsset; chunkCount?: number }>,
): IngestionActionState {
  if (!response.ok) {
    return {
      status: "error",
      message: "Unable to create document.",
      retryable: response.code !== "validation_denied",
    };
  }

  const chunkCount = response.data.chunkCount;
  const suffix =
    typeof chunkCount === "number"
      ? ` (indexed ${chunkCount} chunks).`
      : "";

  return {
    status: "created",
    document: mapDocument(response.data.document),
    message: `Document queued for ingestion.${suffix}`,
    retryable: false,
  };
}

export function mapIngestionFailResponse(
  response: ApiResponse<{ document: DocumentAsset }>,
): IngestionActionState {
  if (!response.ok) {
    return {
      status: "error",
      message: "Unable to mark document as failed.",
      retryable: response.code !== "validation_denied",
    };
  }

  const document = mapDocument(response.data.document);
  const message =
    document.status === "dead_letter"
      ? "Document moved to dead letter."
      : "Document marked as failed.";

  return {
    status: "updated",
    document,
    message,
    retryable: false,
  };
}

export function mapIngestionRetryResponse(
  response: ApiResponse<{ document: DocumentAsset }>,
): IngestionActionState {
  if (!response.ok) {
    return {
      status: "error",
      message: "Unable to retry document ingestion.",
      retryable: response.code !== "validation_denied",
    };
  }

  return {
    status: "updated",
    document: mapDocument(response.data.document),
    message: "Document queued for retry.",
    retryable: false,
  };
}

export function mapIngestionProcessingResponse(
  response: ApiResponse<{ document: DocumentAsset }>,
): IngestionActionState {
  if (!response.ok) {
    return {
      status: "error",
      message: "Unable to mark document as processing.",
      retryable: response.code !== "validation_denied",
    };
  }

  return {
    status: "updated",
    document: mapDocument(response.data.document),
    message: "Document processing started.",
    retryable: false,
  };
}

export function mapIngestionCompleteResponse(
  response: ApiResponse<{ document: DocumentAsset }>,
): IngestionActionState {
  if (!response.ok) {
    return {
      status: "error",
      message: "Unable to complete document ingestion.",
      retryable: response.code !== "validation_denied",
    };
  }

  return {
    status: "updated",
    document: mapDocument(response.data.document),
    message: "Document ingestion completed.",
    retryable: false,
  };
}
