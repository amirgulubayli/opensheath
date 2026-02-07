import assert from "node:assert/strict";
import test from "node:test";

import { apiError, apiSuccess } from "@ethoxford/contracts";

import {
  mapOAuthExchangeResponse,
  mapSessionRefreshResponse,
  mapSignUpResponse,
} from "./auth-lifecycle.js";

test("mapSignUpResponse maps successful sign-up", () => {
  const state = mapSignUpResponse(
    apiSuccess("corr_signup", {
      session: {
        sessionId: "sess_1",
        userId: "user_1",
        workspaceId: "ws_1",
        expiresAt: "2026-02-08T00:00:00.000Z",
      },
    }),
  );

  assert.equal(state.status, "signed_in");
  assert.equal(state.retryable, false);
});

test("mapSignUpResponse maps conflict deterministically", () => {
  const state = mapSignUpResponse(
    apiError("corr_signup_2", "conflict", "Email already exists"),
  );

  assert.equal(state.status, "conflict");
  assert.equal(state.retryable, false);
});

test("mapSessionRefreshResponse maps rotated session metadata", () => {
  const state = mapSessionRefreshResponse(
    apiSuccess("corr_refresh", {
      session: {
        sessionId: "sess_2",
        userId: "user_1",
        workspaceId: "ws_1",
        expiresAt: "2026-02-08T00:00:00.000Z",
      },
      rotatedFromSessionId: "sess_1",
    }),
  );

  assert.equal(state.status, "refreshed");
  assert.equal(state.rotatedFromSessionId, "sess_1");
  assert.equal(state.sessionId, "sess_2");
});

test("mapSessionRefreshResponse maps auth_denied to session_expired", () => {
  const state = mapSessionRefreshResponse(
    apiError("corr_refresh_2", "auth_denied", "Expired session"),
  );

  assert.equal(state.status, "session_expired");
  assert.equal(state.retryable, true);
});

test("mapOAuthExchangeResponse maps linked_existing and created_new states", () => {
  const linked = mapOAuthExchangeResponse(
    apiSuccess("corr_oauth_1", {
      session: {
        sessionId: "sess_3",
        userId: "user_1",
        workspaceId: "ws_1",
        expiresAt: "2026-02-08T00:00:00.000Z",
      },
      provider: "google",
      linkStatus: "linked_existing",
    }),
  );

  assert.equal(linked.status, "signed_in");
  assert.equal(linked.provider, "google");
  assert.equal(linked.linkStatus, "linked_existing");
  assert.equal(linked.message, "Signed in with Google.");

  const created = mapOAuthExchangeResponse(
    apiSuccess("corr_oauth_2", {
      session: {
        sessionId: "sess_4",
        userId: "user_2",
        workspaceId: "ws_1",
        expiresAt: "2026-02-08T00:00:00.000Z",
      },
      provider: "github",
      linkStatus: "created_new",
    }),
  );

  assert.equal(created.status, "signed_in");
  assert.equal(created.linkStatus, "created_new");
  assert.equal(created.message, "New account created via GitHub.");
});

test("mapOAuthExchangeResponse maps policy_denied to forbidden", () => {
  const state = mapOAuthExchangeResponse(
    apiError("corr_oauth_3", "policy_denied", "Denied"),
  );

  assert.equal(state.status, "forbidden");
  assert.equal(state.retryable, false);
});
