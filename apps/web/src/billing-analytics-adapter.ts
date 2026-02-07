import type {
  AnalyticsEventRecord,
  ApiResponse,
  EntitlementIntegrityAnomaly,
  EntitlementSnapshot,
} from "@ethoxford/contracts";

export interface AnalyticsTimelineRow {
  id: string;
  eventName: string;
  eventVersion: string;
  planId: string;
  occurredAt: string;
  payloadValidationStatus: AnalyticsEventRecord["payloadValidationStatus"];
  payloadValidationLabel: string;
  entitlementSummary: string;
}

export interface AnalyticsTimelineState {
  status: "ready" | "empty" | "error";
  rows: AnalyticsTimelineRow[];
  message?: string;
}

export interface IntegrityAnomalyCard {
  id: string;
  eventName: string;
  mismatchSummary: string;
  expectedPlanId: string;
  observedPlanId: string;
  correlationId: string;
  detectedAt: string;
}

export interface IntegrityAnomalyState {
  status: "ready" | "empty" | "error";
  cards: IntegrityAnomalyCard[];
  message?: string;
}

function toEpoch(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortByTimestampDesc<T>(
  items: readonly T[],
  timestamp: (item: T) => string,
): T[] {
  return [...items].sort((a, b) => toEpoch(timestamp(b)) - toEpoch(timestamp(a)));
}

function validationLabel(status: AnalyticsEventRecord["payloadValidationStatus"]): string {
  switch (status) {
    case "valid":
      return "Valid";
    case "missing_required_fields":
      return "Missing required fields";
    case "invalid_schema":
    default:
      return "Invalid schema";
  }
}

function entitlementSummary(snapshot: EntitlementSnapshot): string {
  const base = `${snapshot.featureKey}: ${snapshot.entitlementStatus}`;

  if (
    snapshot.quotaKey &&
    snapshot.consumedUnits !== undefined &&
    snapshot.limitUnits !== undefined
  ) {
    return `${base} (${snapshot.quotaKey} ${snapshot.consumedUnits}/${snapshot.limitUnits})`;
  }

  if (snapshot.quotaKey) {
    return `${base} (${snapshot.quotaKey})`;
  }

  return base;
}

export function mapAnalyticsEventsToTimeline(
  response: ApiResponse<{ events: AnalyticsEventRecord[] }>,
): AnalyticsTimelineState {
  if (!response.ok) {
    return {
      status: "error",
      rows: [],
      message: "Unable to load analytics events.",
    };
  }

  if (response.data.events.length === 0) {
    return {
      status: "empty",
      rows: [],
      message: "No analytics events have been recorded.",
    };
  }

  const rows = sortByTimestampDesc(response.data.events, (event) => event.occurredAt).map(
    (event) => ({
      id: event.analyticsEventId,
      eventName: event.eventName,
      eventVersion: event.eventVersion,
      planId: event.planId,
      occurredAt: event.occurredAt,
      payloadValidationStatus: event.payloadValidationStatus,
      payloadValidationLabel: validationLabel(event.payloadValidationStatus),
      entitlementSummary: entitlementSummary(event.entitlementSnapshot),
    }),
  );

  return {
    status: "ready",
    rows,
  };
}

export function mapIntegrityAnomaliesToCards(
  response: ApiResponse<{ anomalies: EntitlementIntegrityAnomaly[] }>,
): IntegrityAnomalyState {
  if (!response.ok) {
    return {
      status: "error",
      cards: [],
      message: "Unable to load integrity anomalies.",
    };
  }

  if (response.data.anomalies.length === 0) {
    return {
      status: "empty",
      cards: [],
      message: "No integrity anomalies detected.",
    };
  }

  const cards = sortByTimestampDesc(
    response.data.anomalies,
    (anomaly) => anomaly.detectedAt,
  ).map((anomaly) => ({
    id: anomaly.anomalyId,
    eventName: anomaly.eventName,
    mismatchSummary: `${anomaly.expectedPlanId} -> ${anomaly.observedPlanId}`,
    expectedPlanId: anomaly.expectedPlanId,
    observedPlanId: anomaly.observedPlanId,
    correlationId: anomaly.correlationId,
    detectedAt: anomaly.detectedAt,
  }));

  return {
    status: "ready",
    cards,
  };
}
