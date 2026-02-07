import type { ApiResponse, OAuthExchangeResponse } from "@ethoxford/contracts";

import { mapOAuthExchangeResponse } from "./auth-lifecycle.js";

export type OAuthCallbackStatus =
  | "awaiting_exchange"
  | "signed_in"
  | "session_expired"
  | "forbidden"
  | "canceled"
  | "provider_error"
  | "invalid_callback"
  | "error";

export interface OAuthCallbackDiagnostics {
  hasCode: boolean;
  hasState: boolean;
  providerErrorCode?: string;
  providerErrorDescription?: string;
}

export interface OAuthCallbackState {
  status: OAuthCallbackStatus;
  message: string;
  retryable: boolean;
  redirectTo: "/dashboard" | "/sign-in";
  diagnostics: OAuthCallbackDiagnostics;
  provider?: OAuthExchangeResponse["provider"];
  linkStatus?: OAuthExchangeResponse["linkStatus"];
}

export interface OAuthCallbackInput {
  query: URLSearchParams;
  exchangeResponse?: ApiResponse<OAuthExchangeResponse>;
}

function parseProviderErrorDescription(query: URLSearchParams): string | undefined {
  const raw = query.get("error_description");

  if (!raw) {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function defaultProviderErrorMessage(code: string): string {
  switch (code) {
    case "access_denied":
      return "Sign-in was canceled by the identity provider.";
    case "temporarily_unavailable":
      return "Identity provider is temporarily unavailable.";
    case "server_error":
      return "Identity provider returned a server error.";
    default:
      return "Identity provider returned an unexpected error.";
  }
}

export function extractOAuthCallbackDiagnostics(
  query: URLSearchParams,
): OAuthCallbackDiagnostics {
  const providerErrorCode = query.get("error") ?? undefined;
  const providerErrorDescription = parseProviderErrorDescription(query);

  const diagnostics: OAuthCallbackDiagnostics = {
    hasCode: Boolean(query.get("code")),
    hasState: Boolean(query.get("state")),
  };

  if (providerErrorCode) {
    diagnostics.providerErrorCode = providerErrorCode;
  }

  if (providerErrorDescription) {
    diagnostics.providerErrorDescription = providerErrorDescription;
  }

  return diagnostics;
}

export function mapOAuthCallbackState(input: OAuthCallbackInput): OAuthCallbackState {
  const diagnostics = extractOAuthCallbackDiagnostics(input.query);

  if (diagnostics.providerErrorCode) {
    const message =
      diagnostics.providerErrorDescription ??
      defaultProviderErrorMessage(diagnostics.providerErrorCode);

    if (diagnostics.providerErrorCode === "access_denied") {
      return {
        status: "canceled",
        message,
        retryable: true,
        redirectTo: "/sign-in",
        diagnostics,
      };
    }

    return {
      status: "provider_error",
      message,
      retryable:
        diagnostics.providerErrorCode === "temporarily_unavailable" ||
        diagnostics.providerErrorCode === "server_error",
      redirectTo: "/sign-in",
      diagnostics,
    };
  }

  if (!diagnostics.hasCode || !diagnostics.hasState) {
    return {
      status: "invalid_callback",
      message: "OAuth callback is missing required state or authorization code.",
      retryable: false,
      redirectTo: "/sign-in",
      diagnostics,
    };
  }

  if (!input.exchangeResponse) {
    return {
      status: "awaiting_exchange",
      message: "Completing secure sign-in...",
      retryable: false,
      redirectTo: "/sign-in",
      diagnostics,
    };
  }

  const authState = mapOAuthExchangeResponse(input.exchangeResponse);

  if (authState.status === "signed_in" && input.exchangeResponse.ok) {
    const message =
      input.exchangeResponse.data.linkStatus === "created_new"
        ? "OAuth sign-in completed and a new account was created."
        : "OAuth sign-in completed.";
    return {
      status: "signed_in",
      message,
      retryable: false,
      redirectTo: "/dashboard",
      diagnostics,
      provider: input.exchangeResponse.data.provider,
      linkStatus: input.exchangeResponse.data.linkStatus,
    };
  }

  if (authState.status === "session_expired") {
    return {
      status: "session_expired",
      message: authState.message,
      retryable: authState.retryable,
      redirectTo: "/sign-in",
      diagnostics,
    };
  }

  if (authState.status === "conflict") {
    return {
      status: "provider_error",
      message: authState.message,
      retryable: false,
      redirectTo: "/sign-in",
      diagnostics,
    };
  }

  if (authState.status === "forbidden") {
    return {
      status: "forbidden",
      message: authState.message,
      retryable: false,
      redirectTo: "/sign-in",
      diagnostics,
    };
  }

  return {
    status: "error",
    message: authState.message,
    retryable: authState.retryable,
    redirectTo: "/sign-in",
    diagnostics,
  };
}
