import type {
  ApiResponse,
  DocumentAsset,
  DocumentEvent,
  ProjectEvent,
  ProjectRecord,
} from "@ethoxford/contracts";

export interface ProjectCardViewModel {
  projectId: string;
  name: string;
  description?: string;
  status: ProjectRecord["status"];
  statusLabel: string;
  updatedAt: string;
}

export interface ProjectDashboardState {
  status: "ready" | "empty" | "error";
  projects: ProjectCardViewModel[];
  message?: string;
}

export interface ProjectMutationState {
  status: "created" | "updated" | "transitioned" | "error";
  project?: ProjectCardViewModel;
  message: string;
  retryable: boolean;
}

export interface DocumentCardViewModel {
  documentId: string;
  name: string;
  source: string;
  status: DocumentAsset["status"];
  statusLabel: string;
  updatedAt: string;
  retryEligible: boolean;
  replayRequired: boolean;
}

export interface DocumentDashboardState {
  status: "ready" | "empty" | "error";
  documents: DocumentCardViewModel[];
  message?: string;
}

export interface ActivityTimelineItem {
  eventId: string;
  eventType: string;
  statusLabel: string;
  occurredAt: string;
}

export interface ActivityTimelineState {
  status: "ready" | "empty" | "error";
  items: ActivityTimelineItem[];
  message?: string;
}

function toEpoch(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortByDesc<T>(items: readonly T[], key: (item: T) => string): T[] {
  return [...items].sort((a, b) => toEpoch(key(b)) - toEpoch(key(a)));
}

function projectStatusLabel(status: ProjectRecord["status"]): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "active":
      return "Active";
    case "archived":
    default:
      return "Archived";
  }
}

function mapProject(project: ProjectRecord): ProjectCardViewModel {
  return {
    projectId: project.projectId,
    name: project.name,
    ...(project.description !== undefined ? { description: project.description } : {}),
    status: project.status,
    statusLabel: projectStatusLabel(project.status),
    updatedAt: project.updatedAt,
  };
}

function documentStatusLabel(status: DocumentAsset["status"]): string {
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

function activityLabel(eventType: string, fallbackStatus: string): string {
  switch (eventType) {
    case "project.created":
      return "Project created";
    case "project.updated":
      return "Project updated";
    case "project.archived":
      return "Project archived";
    case "document.created":
      return "Document created";
    case "document.processing":
      return "Document processing";
    case "document.retrying":
      return "Document retrying";
    case "document.failed":
      return "Document failed";
    case "document.completed":
      return "Document completed";
    case "document.dead_letter":
      return "Document dead letter";
    default:
      return fallbackStatus;
  }
}

export function mapProjectsToDashboard(
  response: ApiResponse<{ projects: ProjectRecord[] }>,
): ProjectDashboardState {
  if (!response.ok) {
    return {
      status: "error",
      projects: [],
      message: "Unable to load projects.",
    };
  }

  if (response.data.projects.length === 0) {
    return {
      status: "empty",
      projects: [],
      message: "No projects have been created yet.",
    };
  }

  return {
    status: "ready",
    projects: sortByDesc(response.data.projects, (project) => project.updatedAt).map(
      mapProject,
    ),
  };
}

export function mapProjectCreateResponse(
  response: ApiResponse<{ project: ProjectRecord }>,
): ProjectMutationState {
  if (!response.ok) {
    return {
      status: "error",
      message: "Unable to create project.",
      retryable: response.code !== "validation_denied",
    };
  }

  return {
    status: "created",
    project: mapProject(response.data.project),
    message: "Project created.",
    retryable: false,
  };
}

export function mapProjectUpdateResponse(
  response: ApiResponse<{ project: ProjectRecord }>,
): ProjectMutationState {
  if (!response.ok) {
    return {
      status: "error",
      message: "Unable to update project.",
      retryable: response.code !== "validation_denied",
    };
  }

  return {
    status: "updated",
    project: mapProject(response.data.project),
    message: "Project updated.",
    retryable: false,
  };
}

export function mapProjectTransitionResponse(
  response: ApiResponse<{ project: ProjectRecord }>,
): ProjectMutationState {
  if (!response.ok) {
    return {
      status: "error",
      message: "Unable to update project status.",
      retryable: response.code !== "validation_denied",
    };
  }

  return {
    status: "transitioned",
    project: mapProject(response.data.project),
    message: "Project status updated.",
    retryable: false,
  };
}

export function mapDocumentsToDashboard(
  response: ApiResponse<{ documents: DocumentAsset[] }>,
): DocumentDashboardState {
  if (!response.ok) {
    return {
      status: "error",
      documents: [],
      message: "Unable to load documents.",
    };
  }

  if (response.data.documents.length === 0) {
    return {
      status: "empty",
      documents: [],
      message: "No documents have been uploaded yet.",
    };
  }

  return {
    status: "ready",
    documents: sortByDesc(response.data.documents, (document) => document.updatedAt).map(
      (document) => ({
        documentId: document.documentId,
        name: document.name,
        source: document.source,
        status: document.status,
        statusLabel: documentStatusLabel(document.status),
        updatedAt: document.updatedAt,
        retryEligible: document.status === "failed" || document.status === "dead_letter",
        replayRequired: document.status === "dead_letter",
      }),
    ),
  };
}

export function mapProjectActivityToTimeline(
  response: ApiResponse<{ events: ProjectEvent[] }>,
): ActivityTimelineState {
  if (!response.ok) {
    return {
      status: "error",
      items: [],
      message: "Unable to load project activity.",
    };
  }

  if (response.data.events.length === 0) {
    return {
      status: "empty",
      items: [],
      message: "No project activity recorded yet.",
    };
  }

  return {
    status: "ready",
    items: sortByDesc(response.data.events, (event) => event.occurredAt).map((event) => ({
      eventId: event.eventId,
      eventType: event.eventType,
      statusLabel: activityLabel(event.eventType, event.payload.status),
      occurredAt: event.occurredAt,
    })),
  };
}

export function mapDocumentActivityToTimeline(
  response: ApiResponse<{ events: DocumentEvent[] }>,
): ActivityTimelineState {
  if (!response.ok) {
    return {
      status: "error",
      items: [],
      message: "Unable to load document activity.",
    };
  }

  if (response.data.events.length === 0) {
    return {
      status: "empty",
      items: [],
      message: "No document activity recorded yet.",
    };
  }

  return {
    status: "ready",
    items: sortByDesc(response.data.events, (event) => event.occurredAt).map((event) => ({
      eventId: event.eventId,
      eventType: event.eventType,
      statusLabel: activityLabel(event.eventType, event.payload.status),
      occurredAt: event.occurredAt,
    })),
  };
}
