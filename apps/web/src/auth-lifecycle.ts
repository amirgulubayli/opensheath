import type {
  ApiResponse,
  OAuthExchangeResponse,
  SessionRefreshResponse,
  SignInResponse,
} from "@ethoxford/contracts";

export interface AuthLifecycleState {
  status:
    | "signed_in"
    | "refreshed"
    | "conflict"
    | "session_expired"
    | "forbidden"
    | "error";
  message: string;
  retryable: boolean;
}

export interface SessionRefreshState extends AuthLifecycleState {
  rotatedFromSessionId?: string;
  sessionId?: string;
}

export interface OAuthExchangeState extends AuthLifecycleState {
  provider?: OAuthExchangeResponse["provider"];
  linkStatus?: OAuthExchangeResponse["linkStatus"];
}

function providerLabel(provider: OAuthExchangeResponse["provider"]): string {
  switch (provider) {
    case "google":
      return "Google";
    case "github":
      return "GitHub";
    case "microsoft":
    default:
      return "Microsoft";
  }
}

function mapCommonErrorState(code: string): AuthLifecycleState {
  if (code === "conflict") {
    return {
      status: "conflict",
      message: "An account with this email already exists.",
      retryable: false,
    };
  }

  if (code === "auth_denied") {
    return {
      status: "session_expired",
      message: "Session is missing or expired. Sign in again.",
      retryable: true,
    };
  }

  if (code === "policy_denied") {
    return {
      status: "forbidden",
      message: "You are not allowed to perform this action.",
      retryable: false,
    };
  }

  return {
    status: "error",
    message: "Unable to complete authentication flow.",
    retryable: code !== "validation_denied",
  };
}

export function mapSignUpResponse(
  response: ApiResponse<SignInResponse>,
): AuthLifecycleState {
  if (response.ok) {
    return {
      status: "signed_in",
      message: "Account created and signed in.",
      retryable: false,
    };
  }

  return mapCommonErrorState(response.code);
}

export function mapSessionRefreshResponse(
  response: ApiResponse<SessionRefreshResponse>,
): SessionRefreshState {
  if (response.ok) {
    return {
      status: "refreshed",
      message: "Session refreshed successfully.",
      retryable: false,
      rotatedFromSessionId: response.data.rotatedFromSessionId,
      sessionId: response.data.session.sessionId,
    };
  }

  return mapCommonErrorState(response.code);
}

export function mapOAuthExchangeResponse(
  response: ApiResponse<OAuthExchangeResponse>,
): OAuthExchangeState {
  if (response.ok) {
    const provider = providerLabel(response.data.provider);
    const message =
      response.data.linkStatus === "created_new"
        ? `New account created via ${provider}.`
        : `Signed in with ${provider}.`;

    return {
      status: "signed_in",
      message,
      retryable: false,
      provider: response.data.provider,
      linkStatus: response.data.linkStatus,
    };
  }

  return mapCommonErrorState(response.code);
}
