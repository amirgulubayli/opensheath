import type {
  ApiError,
  ApiErrorCode,
  ApiResponse,
  SessionDto,
  SignInResponse,
} from "@ethoxford/contracts";

export type AuthShellStatus =
  | "signed_out"
  | "signing_in"
  | "signed_in"
  | "session_expired"
  | "forbidden"
  | "error";

export interface AuthShellState {
  status: AuthShellStatus;
  message: string;
  retryable: boolean;
}

const AUTH_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  validation_denied: "Please verify your credentials and try again.",
  auth_denied: "Your session is invalid. Please sign in again.",
  policy_denied: "You do not have permission to access this area.",
  not_found: "Requested resource was not found.",
  conflict: "Your request could not be completed due to a conflict.",
  rate_limited: "Too many attempts. Try again shortly.",
  unavailable: "Service is temporarily unavailable. Try again soon.",
  internal_error: "Something went wrong. Please try again.",
};

function stateFromApiError(error: ApiError): AuthShellState {
  switch (error.code) {
    case "auth_denied":
      return {
        status: "session_expired",
        message: AUTH_ERROR_MESSAGES[error.code],
        retryable: true,
      };
    case "policy_denied":
      return {
        status: "forbidden",
        message: AUTH_ERROR_MESSAGES[error.code],
        retryable: false,
      };
    default:
      return {
        status: "error",
        message: AUTH_ERROR_MESSAGES[error.code],
        retryable: error.code !== "validation_denied",
      };
  }
}

export function signedOutState(): AuthShellState {
  return {
    status: "signed_out",
    message: "Sign in to continue.",
    retryable: false,
  };
}

export function signingInState(): AuthShellState {
  return {
    status: "signing_in",
    message: "Signing you in...",
    retryable: false,
  };
}

export function mapSignInResponse(
  response: ApiResponse<SignInResponse>,
): AuthShellState {
  if (response.ok) {
    return {
      status: "signed_in",
      message: "Signed in successfully.",
      retryable: false,
    };
  }

  return stateFromApiError(response);
}

export function mapSessionCheckResponse(
  response: ApiResponse<{ session: SessionDto }>,
): AuthShellState {
  if (response.ok) {
    return {
      status: "signed_in",
      message: "Session is active.",
      retryable: false,
    };
  }

  return stateFromApiError(response);
}

