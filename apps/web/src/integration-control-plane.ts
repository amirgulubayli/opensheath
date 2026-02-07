import type {
  ApiResponse,
  AutomationRun,
  ConnectorRecord,
  EventIngestionRecord,
  OutboundWebhookDeliveryRecord,
} from "@ethoxford/contracts";

import { mapAutomationRunsToState, mapConnectorsToDashboard, mapEventIngestionToState } from "./integration-automation-adapter.js";
import { mapWebhookDeliveriesToState } from "./webhook-delivery-adapter.js";

export type IntegrationControlPlaneStatus = "healthy" | "degraded" | "critical" | "error";

export interface IntegrationControlPlaneSummary {
  status: IntegrationControlPlaneStatus;
  summary: string;
  connectorCount: number;
  degradedConnectorCount: number;
  deadLetterRunCount: number;
  failedWebhookCount: number;
  deadLetterWebhookCount: number;
  rejectedIngressCount: number;
}

export interface BuildIntegrationControlPlaneInput {
  connectorsResponse: ApiResponse<{ connectors: ConnectorRecord[] }>;
  runsResponse: ApiResponse<{ runs: AutomationRun[] }>;
  ingestionResponse: ApiResponse<{ records: EventIngestionRecord[] }>;
  deliveriesResponse: ApiResponse<{ deliveries: OutboundWebhookDeliveryRecord[] }>;
}

function summaryMessage(status: IntegrationControlPlaneStatus): string {
  switch (status) {
    case "healthy":
      return "Integrations and automation are operating normally.";
    case "degraded":
      return "Integrations are degraded. Review failed runs or delivery retries.";
    case "critical":
      return "Critical integration failures detected. Immediate response required.";
    case "error":
    default:
      return "Integration control-plane health could not be resolved.";
  }
}

export function buildIntegrationControlPlaneSummary(
  input: BuildIntegrationControlPlaneInput,
): IntegrationControlPlaneSummary {
  const connectorsState = mapConnectorsToDashboard(input.connectorsResponse);
  const runsState = mapAutomationRunsToState(input.runsResponse);
  const ingestionState = mapEventIngestionToState(input.ingestionResponse);
  const deliveriesState = mapWebhookDeliveriesToState(input.deliveriesResponse);

  if (
    connectorsState.status === "error" ||
    runsState.status === "error" ||
    ingestionState.status === "error" ||
    deliveriesState.status === "error"
  ) {
    return {
      status: "error",
      summary: summaryMessage("error"),
      connectorCount: 0,
      degradedConnectorCount: 0,
      deadLetterRunCount: 0,
      failedWebhookCount: 0,
      deadLetterWebhookCount: 0,
      rejectedIngressCount: 0,
    };
  }

  const degradedConnectorCount = connectorsState.connectors.filter(
    (connector) => connector.status === "degraded",
  ).length;
  const deadLetterRunCount = runsState.runs.filter(
    (run) => run.status === "dead_letter",
  ).length;
  const failedWebhookCount = deliveriesState.deliveries.filter(
    (delivery) => delivery.status === "failed",
  ).length;
  const deadLetterWebhookCount = deliveriesState.deliveries.filter(
    (delivery) => delivery.status === "dead_letter",
  ).length;
  const rejectedIngressCount = ingestionState.records.filter(
    (record) => record.ingestionStatus === "rejected_signature",
  ).length;

  let status: IntegrationControlPlaneStatus = "healthy";
  if (deadLetterRunCount > 0 || deadLetterWebhookCount > 0) {
    status = "critical";
  } else if (degradedConnectorCount > 0 || failedWebhookCount > 0 || rejectedIngressCount > 0) {
    status = "degraded";
  }

  return {
    status,
    summary: summaryMessage(status),
    connectorCount: connectorsState.connectors.length,
    degradedConnectorCount,
    deadLetterRunCount,
    failedWebhookCount,
    deadLetterWebhookCount,
    rejectedIngressCount,
  };
}
