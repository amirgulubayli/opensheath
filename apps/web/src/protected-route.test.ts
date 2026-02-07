import assert from "node:assert/strict";
import test from "node:test";

import { apiError, apiSuccess } from "@ethoxford/contracts";

import { decideProtectedRoute } from "./protected-route.js";

test("missing session response redirects to sign-in", () => {
  const decision = decideProtectedRoute({
    path: "/dashboard",
  });

  assert.deepEqual(decision.authState, {
    status: "signed_out",
    message: "Sign in to continue.",
    retryable: false,
  });
  assert.deepEqual(decision.navigation, {
    kind: "redirect",
    to: "/sign-in",
    reason: "auth_required",
  });
});

test("active session allows protected route render", () => {
  const decision = decideProtectedRoute({
    path: "/dashboard",
    sessionResponse: apiSuccess("corr_route", {
      session: {
        sessionId: "sess_10",
        userId: "user_10",
        workspaceId: "ws_10",
        expiresAt: new Date().toISOString(),
      },
    }),
  });

  assert.equal(decision.authState.status, "signed_in");
  assert.equal(decision.navigation.kind, "render");
  if (decision.navigation.kind === "render") {
    assert.equal(decision.navigation.route.id, "dashboard");
  }
});

test("auth_denied session check redirects to sign-in", () => {
  const decision = decideProtectedRoute({
    path: "/workspaces",
    sessionResponse: apiError("corr_route_2", "auth_denied", "Expired"),
  });

  assert.equal(decision.authState.status, "session_expired");
  assert.deepEqual(decision.navigation, {
    kind: "redirect",
    to: "/sign-in",
    reason: "auth_required",
  });
});

test("policy_denied redirects to not-found safe fallback", () => {
  const decision = decideProtectedRoute({
    path: "/settings",
    sessionResponse: apiError("corr_route_3", "policy_denied", "Forbidden"),
  });

  assert.equal(decision.authState.status, "forbidden");
  assert.deepEqual(decision.navigation, {
    kind: "redirect",
    to: "/not-found",
    reason: "route_not_found",
  });
});

