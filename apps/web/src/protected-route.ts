import type { ApiResponse, SessionDto } from "@ethoxford/contracts";

import {
  mapSessionCheckResponse,
  signedOutState,
  type AuthShellState,
} from "./auth-shell.js";
import { resolveNavigation, type NavigationDecision } from "./app-shell.js";

export interface ProtectedRouteDecision {
  authState: AuthShellState;
  navigation: NavigationDecision;
}

export interface ProtectedRouteInput {
  path: string;
  sessionResponse?: ApiResponse<{ session: SessionDto }>;
}

export function decideProtectedRoute(
  input: ProtectedRouteInput,
): ProtectedRouteDecision {
  if (!input.sessionResponse) {
    return {
      authState: signedOutState(),
      navigation: {
        kind: "redirect",
        to: "/sign-in",
        reason: "auth_required",
      },
    };
  }

  const authState = mapSessionCheckResponse(input.sessionResponse);
  if (authState.status === "signed_in") {
    return {
      authState,
      navigation: resolveNavigation({
        path: input.path,
        isAuthenticated: true,
      }),
    };
  }

  if (authState.status === "forbidden") {
    return {
      authState,
      navigation: {
        kind: "redirect",
        to: "/not-found",
        reason: "route_not_found",
      },
    };
  }

  return {
    authState,
    navigation: {
      kind: "redirect",
      to: "/sign-in",
      reason: "auth_required",
    },
  };
}
