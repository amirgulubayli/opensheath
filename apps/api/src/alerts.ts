import type { MetricsSnapshot } from "./observability.js";
import type {
  AuthAlert,
  AuthAlertEvaluation,
  AuthAlertThresholds,
} from "@ethoxford/contracts";

export type { AuthAlert, AuthAlertEvaluation, AuthAlertThresholds };

export const AUTH_INCIDENT_RUNBOOK_PATH =
  "docs/07-role-sprint-plans/sprint-02-observability-auth-baseline/devops-sre-engineer/incident-alert-validation-plan.md";

export const DEFAULT_AUTH_ALERT_THRESHOLDS: AuthAlertThresholds = {
  minAuthRequestCount: 10,
  p1AuthFailureRate: 0.4,
  p2UnauthorizedAttemptCount: 10,
};

function round(value: number): number {
  return Number(value.toFixed(4));
}

function authFailureRate(snapshot: MetricsSnapshot): number {
  const auth = snapshot.totals.auth;

  if (auth.requestCount === 0) {
    return 0;
  }

  return auth.failureCount / auth.requestCount;
}

export function evaluateAuthAlerts(
  snapshot: MetricsSnapshot,
  thresholds: AuthAlertThresholds = DEFAULT_AUTH_ALERT_THRESHOLDS,
): AuthAlertEvaluation {
  const alerts: AuthAlert[] = [];
  const failureRate = authFailureRate(snapshot);
  const authTotals = snapshot.totals.auth;

  if (
    authTotals.requestCount >= thresholds.minAuthRequestCount &&
    failureRate >= thresholds.p1AuthFailureRate
  ) {
    alerts.push({
      code: "auth_failure_rate_high",
      severity: "p1",
      value: round(failureRate),
      threshold: thresholds.p1AuthFailureRate,
      message: "Authentication failure rate exceeded threshold",
      runbook: AUTH_INCIDENT_RUNBOOK_PATH,
    });
  }

  if (authTotals.unauthorizedAttemptCount >= thresholds.p2UnauthorizedAttemptCount) {
    alerts.push({
      code: "unauthorized_attempt_spike",
      severity: "p2",
      value: authTotals.unauthorizedAttemptCount,
      threshold: thresholds.p2UnauthorizedAttemptCount,
      message: "Unauthorized attempt volume exceeded threshold",
      runbook: AUTH_INCIDENT_RUNBOOK_PATH,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    thresholds,
    authTotals,
    alerts,
  };
}
