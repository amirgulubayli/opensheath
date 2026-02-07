import type {
  ApiResponse,
  AutomationRule,
  AutomationRun,
  ConnectorRecord,
  EventIngestionRecord,
} from "@ethoxford/contracts";

export interface ConnectorCardViewModel {
  connectorId: string;
  provider: string;
  authType: ConnectorRecord["authType"];
  status: ConnectorRecord["status"];
  statusLabel: string;
  updatedAt: string;
  lastErrorMessage?: string;
}

export interface ConnectorDashboardState {
  status: "ready" | "empty" | "error";
  connectors: ConnectorCardViewModel[];
  message?: string;
}

export interface AutomationRuleViewModel {
  ruleId: string;
  eventType: string;
  actionName: string;
  maxRetries: number;
}

export interface AutomationRuleState {
  status: "ready" | "empty" | "error";
  rules: AutomationRuleViewModel[];
  message?: string;
}

export interface AutomationRunViewModel {
  runId: string;
  ruleId: string;
  status: AutomationRun["status"];
  statusLabel: string;
  attempts: number;
  completedAt: string;
  lastError?: string;
}

export interface AutomationRunState {
  status: "ready" | "empty" | "error";
  runs: AutomationRunViewModel[];
  message?: string;
}

export interface EventIngestionViewModel {
  eventId: string;
  sourceSystem: string;
  eventType: string;
  ingestionStatus: EventIngestionRecord["ingestionStatus"];
  ingestionLabel: string;
  receivedAt: string;
  correlationId: string;
}

export interface EventIngestionState {
  status: "ready" | "empty" | "error";
  records: EventIngestionViewModel[];
  message?: string;
}

export interface PublishEventResultState {
  status: "accepted" | "duplicate_or_rejected" | "error";
  eventId?: string;
  message: string;
  retryable: boolean;
}

function toEpoch(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortByDesc<T>(items: readonly T[], key: (item: T) => string): T[] {
  return [...items].sort((a, b) => toEpoch(key(b)) - toEpoch(key(a)));
}

function connectorStatusLabel(connector: ConnectorRecord): string {
  switch (connector.status) {
    case "connected":
      return "Connected";
    case "degraded":
      return "Degraded";
    case "revoked":
    default:
      return "Revoked";
  }
}

function ingestionStatusLabel(status: EventIngestionRecord["ingestionStatus"]): string {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "duplicate":
      return "Duplicate";
    case "rejected_signature":
    default:
      return "Rejected Signature";
  }
}

function runStatusLabel(status: AutomationRun["status"]): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "dead_letter":
    default:
      return "Dead Letter";
  }
}

export function mapConnectorsToDashboard(
  response: ApiResponse<{ connectors: ConnectorRecord[] }>,
): ConnectorDashboardState {
  if (!response.ok) {
    return {
      status: "error",
      connectors: [],
      message: "Unable to load connector status.",
    };
  }

  if (response.data.connectors.length === 0) {
    return {
      status: "empty",
      connectors: [],
      message: "No connectors configured.",
    };
  }

  return {
    status: "ready",
    connectors: sortByDesc(response.data.connectors, (connector) => connector.updatedAt).map(
      (connector) => ({
        connectorId: connector.connectorId,
        provider: connector.provider,
        authType: connector.authType,
        status: connector.status,
        statusLabel: connectorStatusLabel(connector),
        updatedAt: connector.updatedAt,
        ...(connector.lastErrorMessage
          ? { lastErrorMessage: connector.lastErrorMessage }
          : {}),
      }),
    ),
  };
}

export function mapAutomationRulesToState(
  response: ApiResponse<{ rules: AutomationRule[] }>,
): AutomationRuleState {
  if (!response.ok) {
    return {
      status: "error",
      rules: [],
      message: "Unable to load automation rules.",
    };
  }

  if (response.data.rules.length === 0) {
    return {
      status: "empty",
      rules: [],
      message: "No automation rules configured.",
    };
  }

  return {
    status: "ready",
    rules: response.data.rules.map((rule) => ({
      ruleId: rule.ruleId,
      eventType: rule.eventType,
      actionName: rule.actionName,
      maxRetries: rule.maxRetries,
    })),
  };
}

export function mapAutomationRunsToState(
  response: ApiResponse<{ runs: AutomationRun[] }>,
): AutomationRunState {
  if (!response.ok) {
    return {
      status: "error",
      runs: [],
      message: "Unable to load automation run history.",
    };
  }

  if (response.data.runs.length === 0) {
    return {
      status: "empty",
      runs: [],
      message: "No automation runs recorded.",
    };
  }

  return {
    status: "ready",
    runs: sortByDesc(response.data.runs, (run) => run.completedAt).map((run) => ({
      runId: run.runId,
      ruleId: run.ruleId,
      status: run.status,
      statusLabel: runStatusLabel(run.status),
      attempts: run.attempts,
      completedAt: run.completedAt,
      ...(run.lastError ? { lastError: run.lastError } : {}),
    })),
  };
}

export function mapEventIngestionToState(
  response: ApiResponse<{ records: EventIngestionRecord[] }>,
): EventIngestionState {
  if (!response.ok) {
    return {
      status: "error",
      records: [],
      message: "Unable to load event ingestion diagnostics.",
    };
  }

  if (response.data.records.length === 0) {
    return {
      status: "empty",
      records: [],
      message: "No event ingestion records found.",
    };
  }

  return {
    status: "ready",
    records: sortByDesc(response.data.records, (record) => record.receivedAt).map((record) => ({
      eventId: record.eventId,
      sourceSystem: record.sourceSystem,
      eventType: record.eventType,
      ingestionStatus: record.ingestionStatus,
      ingestionLabel: ingestionStatusLabel(record.ingestionStatus),
      receivedAt: record.receivedAt,
      correlationId: record.correlationId,
    })),
  };
}

export function mapPublishEventResponse(
  response: ApiResponse<{ accepted: boolean; eventId: string }>,
): PublishEventResultState {
  if (!response.ok) {
    return {
      status: "error",
      message: "Unable to publish automation event.",
      retryable: response.code !== "validation_denied",
    };
  }

  if (response.data.accepted) {
    return {
      status: "accepted",
      eventId: response.data.eventId,
      message: "Event accepted for automation processing.",
      retryable: false,
    };
  }

  return {
    status: "duplicate_or_rejected",
    eventId: response.data.eventId,
    message: "Event was already processed or rejected by ingestion policy.",
    retryable: false,
  };
}
