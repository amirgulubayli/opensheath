import type {
  AlertSeverity,
  ApiErrorCode,
  AuthAlert,
  AuthAlertEvaluation,
  AuthAlertThresholds,
  AuthTotalsSnapshot,
} from "@ethoxford/contracts";

export type AuthObservabilityStatus = "healthy" | "degraded" | "critical" | "error";

export interface AuthAlertItemViewModel {
  code: AuthAlert["code"];
  severity: AlertSeverity;
  title: string;
  message: string;
  valueLabel: string;
  thresholdLabel: string;
  runbook: string;
}

export interface AuthObservabilityViewModel {
  status: AuthObservabilityStatus;
  severity: AlertSeverity | "none";
  summary: string;
  generatedAt: string;
  totals: AuthTotalsSnapshot;
  thresholds: AuthAlertThresholds;
  alerts: AuthAlertItemViewModel[];
  retryable: boolean;
}

const ALERT_TITLES: Record<AuthAlert["code"], string> = {
  auth_failure_rate_high: "Authentication failures elevated",
  unauthorized_attempt_spike: "Unauthorized attempts elevated",
};

const OBSERVABILITY_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  validation_denied: "Alert request was invalid. Verify threshold inputs and retry.",
  auth_denied: "Authentication is required to view auth alerts.",
  policy_denied: "You do not have permission to view auth alerts.",
  not_found: "Auth alert endpoint was not found.",
  conflict: "Auth alert request conflicted with server state.",
  rate_limited: "Auth alert requests are being rate limited. Try again shortly.",
  unavailable: "Auth observability service is temporarily unavailable.",
  internal_error: "Unable to load auth observability due to an internal error.",
};

const EMPTY_TOTALS: AuthTotalsSnapshot = {
  requestCount: 0,
  failureCount: 0,
  unauthorizedAttemptCount: 0,
};

const EMPTY_THRESHOLDS: AuthAlertThresholds = {
  minAuthRequestCount: 0,
  p1AuthFailureRate: 0,
  p2UnauthorizedAttemptCount: 0,
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatAlertValue(alert: AuthAlert): string {
  if (alert.code === "auth_failure_rate_high") {
    return formatPercent(alert.value);
  }

  return `${Math.round(alert.value)}`;
}

function formatAlertThreshold(alert: AuthAlert): string {
  if (alert.code === "auth_failure_rate_high") {
    return formatPercent(alert.threshold);
  }

  return `${Math.round(alert.threshold)}`;
}

function highestSeverity(alerts: readonly AuthAlert[]): AlertSeverity | "none" {
  if (alerts.some((alert) => alert.severity === "p1")) {
    return "p1";
  }

  if (alerts.some((alert) => alert.severity === "p2")) {
    return "p2";
  }

  return "none";
}

function mapAlert(alert: AuthAlert): AuthAlertItemViewModel {
  return {
    code: alert.code,
    severity: alert.severity,
    title: ALERT_TITLES[alert.code],
    message: alert.message,
    valueLabel: formatAlertValue(alert),
    thresholdLabel: formatAlertThreshold(alert),
    runbook: alert.runbook,
  };
}

export function mapAuthAlertEvaluationToViewModel(
  evaluation: AuthAlertEvaluation,
): AuthObservabilityViewModel {
  const severity = highestSeverity(evaluation.alerts);
  const alerts = evaluation.alerts.map(mapAlert);

  if (severity === "none") {
    return {
      status: "healthy",
      severity,
      summary: "Auth pathways are healthy. No active auth alerts.",
      generatedAt: evaluation.generatedAt,
      totals: evaluation.authTotals,
      thresholds: evaluation.thresholds,
      alerts,
      retryable: false,
    };
  }

  if (severity === "p1") {
    return {
      status: "critical",
      severity,
      summary: "P1 auth alert active. Immediate investigation required.",
      generatedAt: evaluation.generatedAt,
      totals: evaluation.authTotals,
      thresholds: evaluation.thresholds,
      alerts,
      retryable: false,
    };
  }

  return {
    status: "degraded",
    severity,
    summary: "Auth alerts detected. Investigation recommended.",
    generatedAt: evaluation.generatedAt,
    totals: evaluation.authTotals,
    thresholds: evaluation.thresholds,
    alerts,
    retryable: false,
  };
}

export function authObservabilityErrorState(
  code: ApiErrorCode,
): AuthObservabilityViewModel {
  return {
    status: "error",
    severity: "none",
    summary: OBSERVABILITY_ERROR_MESSAGES[code],
    generatedAt: new Date().toISOString(),
    totals: EMPTY_TOTALS,
    thresholds: EMPTY_THRESHOLDS,
    alerts: [],
    retryable: code !== "validation_denied" && code !== "policy_denied",
  };
}

export function buildAuthAlertThresholdQuery(
  thresholds: Partial<AuthAlertThresholds>,
): string {
  const params = new URLSearchParams();

  if (
    thresholds.minAuthRequestCount !== undefined &&
    Number.isFinite(thresholds.minAuthRequestCount) &&
    thresholds.minAuthRequestCount >= 0
  ) {
    params.set("minAuthRequests", String(thresholds.minAuthRequestCount));
  }

  if (
    thresholds.p1AuthFailureRate !== undefined &&
    Number.isFinite(thresholds.p1AuthFailureRate) &&
    thresholds.p1AuthFailureRate >= 0
  ) {
    params.set("p1FailureRate", String(thresholds.p1AuthFailureRate));
  }

  if (
    thresholds.p2UnauthorizedAttemptCount !== undefined &&
    Number.isFinite(thresholds.p2UnauthorizedAttemptCount) &&
    thresholds.p2UnauthorizedAttemptCount >= 0
  ) {
    params.set(
      "p2UnauthorizedAttempts",
      String(thresholds.p2UnauthorizedAttemptCount),
    );
  }

  return params.toString();
}
