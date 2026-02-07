import assert from "node:assert/strict";
import test from "node:test";

import { apiError, apiSuccess, type SessionDto } from "@ethoxford/contracts";

import {
  mapSessionCheckResponse,
  mapSignInResponse,
  signedOutState,
  signingInState,
} from "./auth-shell.js";

test("signedOutState and signingInState are deterministic", () => {
  assert.deepEqual(signedOutState(), {
    status: "signed_out",
    message: "Sign in to continue.",
    retryable: false,
  });

  assert.deepEqual(signingInState(), {
    status: "signing_in",
    message: "Signing you in...",
    retryable: false,
  });
});

test("mapSignInResponse returns signed_in for successful auth", () => {
  const result = mapSignInResponse(
    apiSuccess("corr_1", {
      session: {
        sessionId: "sess_1",
        userId: "user_1",
        workspaceId: "ws_1",
        expiresAt: new Date().toISOString(),
      },
    }),
  );

  assert.deepEqual(result, {
    status: "signed_in",
    message: "Signed in successfully.",
    retryable: false,
  });
});

test("mapSignInResponse maps auth_denied to session_expired", () => {
  const result = mapSignInResponse(
    apiError("corr_2", "auth_denied", "Missing session header"),
  );

  assert.deepEqual(result, {
    status: "session_expired",
    message: "Your session is invalid. Please sign in again.",
    retryable: true,
  });
});

test("mapSessionCheckResponse maps policy_denied to forbidden", () => {
  const result = mapSessionCheckResponse(
    apiError("corr_3", "policy_denied", "Forbidden"),
  );

  assert.deepEqual(result, {
    status: "forbidden",
    message: "You do not have permission to access this area.",
    retryable: false,
  });
});

test("mapSessionCheckResponse maps validation error to non-retryable error", () => {
  const result = mapSessionCheckResponse(
    apiError("corr_4", "validation_denied", "Bad request"),
  );

  assert.deepEqual(result, {
    status: "error",
    message: "Please verify your credentials and try again.",
    retryable: false,
  });
});

test("mapSessionCheckResponse returns signed_in for active session", () => {
  const session: SessionDto = {
    sessionId: "sess_2",
    userId: "user_2",
    workspaceId: "ws_2",
    expiresAt: new Date().toISOString(),
  };

  const result = mapSessionCheckResponse(apiSuccess("corr_5", { session }));
  assert.deepEqual(result, {
    status: "signed_in",
    message: "Session is active.",
    retryable: false,
  });
});

