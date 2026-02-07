import type { ApiResponse, OutboundWebhookDeliveryRecord } from "@ethoxford/contracts";

export interface WebhookDeliveryViewModel {
  deliveryId: string;
  targetUrl: string;
  eventType: string;
  status: OutboundWebhookDeliveryRecord["status"];
  statusLabel: string;
  attemptSummary: string;
  nextRetryAt?: string;
  completedAt?: string;
  lastErrorMessage?: string;
  canReplay: boolean;
}

export interface WebhookDeliveryListState {
  status: "ready" | "empty" | "error";
  deliveries: WebhookDeliveryViewModel[];
  message?: string;
}

export interface WebhookDeliveryMutationState {
  status: "updated" | "error";
  delivery?: WebhookDeliveryViewModel;
  message: string;
  retryable: boolean;
}

function toEpoch(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function statusLabel(status: OutboundWebhookDeliveryRecord["status"]): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "delivered":
      return "Delivered";
    case "failed":
      return "Failed";
    case "dead_letter":
    default:
      return "Dead Letter";
  }
}

function mapDelivery(delivery: OutboundWebhookDeliveryRecord): WebhookDeliveryViewModel {
  return {
    deliveryId: delivery.deliveryId,
    targetUrl: delivery.targetUrl,
    eventType: delivery.eventType,
    status: delivery.status,
    statusLabel: statusLabel(delivery.status),
    attemptSummary: `${delivery.attemptCount}/${delivery.maxAttempts}`,
    ...(delivery.nextRetryAt ? { nextRetryAt: delivery.nextRetryAt } : {}),
    ...(delivery.completedAt ? { completedAt: delivery.completedAt } : {}),
    ...(delivery.lastErrorMessage ? { lastErrorMessage: delivery.lastErrorMessage } : {}),
    canReplay: delivery.status === "failed" || delivery.status === "dead_letter",
  };
}

export function mapWebhookDeliveriesToState(
  response: ApiResponse<{ deliveries: OutboundWebhookDeliveryRecord[] }>,
): WebhookDeliveryListState {
  if (!response.ok) {
    return {
      status: "error",
      deliveries: [],
      message: "Unable to load outbound webhook deliveries.",
    };
  }

  if (response.data.deliveries.length === 0) {
    return {
      status: "empty",
      deliveries: [],
      message: "No outbound webhook deliveries found.",
    };
  }

  return {
    status: "ready",
    deliveries: [...response.data.deliveries]
      .sort((a, b) => toEpoch(b.updatedAt) - toEpoch(a.updatedAt))
      .map(mapDelivery),
  };
}

export function mapWebhookDeliveryMutationResponse(
  response: ApiResponse<{ delivery: OutboundWebhookDeliveryRecord }>,
): WebhookDeliveryMutationState {
  if (!response.ok) {
    return {
      status: "error",
      message: "Unable to update outbound delivery.",
      retryable: response.code !== "validation_denied",
    };
  }

  return {
    status: "updated",
    delivery: mapDelivery(response.data.delivery),
    message: "Outbound delivery updated.",
    retryable: false,
  };
}
