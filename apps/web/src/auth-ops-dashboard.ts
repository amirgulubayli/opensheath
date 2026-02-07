import type {
  ApiErrorCode,
  ApiResponse,
  AuthAlertEvaluation,
  SessionDto,
} from "@ethoxford/contracts";

import {
  authObservabilityErrorState,
  mapAuthAlertEvaluationToViewModel,
  type AuthObservabilityViewModel,
} from "./auth-observability.js";
import {
  mapSessionCheckResponse,
  signedOutState,
  type AuthShellState,
} from "./auth-shell.js";
import {
  mapOAuthCallbackState,
  type OAuthCallbackInput,
  type OAuthCallbackState,
} from "./oauth-callback.js";

export type AuthOpsDashboardStatus = "healthy" | "degraded" | "critical" | "error";

export interface AuthOpsDashboardState {
  status: AuthOpsDashboardStatus;
  summary: string;
  authState: AuthShellState;
  observability: AuthObservabilityViewModel;
  oauthCallback?: OAuthCallbackState;
}

export interface BuildAuthOpsDashboardInput {
  sessionResponse?: ApiResponse<{ session: SessionDto }>;
  alertEvaluation?: AuthAlertEvaluation;
  alertErrorCode?: ApiErrorCode;
  oauthCallbackInput?: OAuthCallbackInput;
}

function resolveDashboardStatus(
  authState: AuthShellState,
  observability: AuthObservabilityViewModel,
  oauth?: OAuthCallbackState,
): AuthOpsDashboardStatus {
  if (observability.status === "critical") {
    return "critical";
  }

  if (observability.status === "error" || authState.status === "error") {
    return "error";
  }

  if (
    authState.status === "session_expired" ||
    authState.status === "forbidden" ||
    observability.status === "degraded" ||
    oauth?.status === "provider_error" ||
    oauth?.status === "canceled" ||
    oauth?.status === "session_expired"
  ) {
    return "degraded";
  }

  if (oauth?.status === "invalid_callback" || oauth?.status === "error") {
    return "error";
  }

  return "healthy";
}

function dashboardSummary(status: AuthOpsDashboardStatus): string {
  switch (status) {
    case "healthy":
      return "Auth operations are healthy.";
    case "degraded":
      return "Auth operations are degraded. Review warnings and recover session flows.";
    case "critical":
      return "Auth operations are critical. Immediate intervention is required.";
    case "error":
    default:
      return "Auth operations status could not be fully resolved.";
  }
}

export function buildAuthOpsDashboardState(
  input: BuildAuthOpsDashboardInput,
): AuthOpsDashboardState {
  const authState = input.sessionResponse
    ? mapSessionCheckResponse(input.sessionResponse)
    : signedOutState();
  const observability = input.alertEvaluation
    ? mapAuthAlertEvaluationToViewModel(input.alertEvaluation)
    : authObservabilityErrorState(input.alertErrorCode ?? "unavailable");
  const oauthCallback = input.oauthCallbackInput
    ? mapOAuthCallbackState(input.oauthCallbackInput)
    : undefined;
  const status = resolveDashboardStatus(authState, observability, oauthCallback);

  return {
    status,
    summary: dashboardSummary(status),
    authState,
    observability,
    ...(oauthCallback ? { oauthCallback } : {}),
  };
}
