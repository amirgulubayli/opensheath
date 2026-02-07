import assert from "node:assert/strict";
import test from "node:test";

import { apiError, apiSuccess, type OAuthExchangeResponse } from "@ethoxford/contracts";

import {
  extractOAuthCallbackDiagnostics,
  mapOAuthCallbackState,
} from "./oauth-callback.js";

function callbackQuery(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

test("mapOAuthCallbackState maps provider access_denied to canceled", () => {
  const result = mapOAuthCallbackState({
    query: callbackQuery("error=access_denied"),
  });

  assert.equal(result.status, "canceled");
  assert.equal(result.retryable, true);
  assert.equal(result.redirectTo, "/sign-in");
});

test("mapOAuthCallbackState maps missing code/state to invalid callback", () => {
  const result = mapOAuthCallbackState({
    query: callbackQuery("code=abc"),
  });

  assert.equal(result.status, "invalid_callback");
  assert.equal(result.retryable, false);
});

test("mapOAuthCallbackState maps callback to awaiting state before exchange", () => {
  const result = mapOAuthCallbackState({
    query: callbackQuery("code=abc&state=xyz"),
  });

  assert.equal(result.status, "awaiting_exchange");
  assert.equal(result.message, "Completing secure sign-in...");
});

test("mapOAuthCallbackState maps successful exchange to signed_in", () => {
  const response: OAuthExchangeResponse = {
    session: {
      sessionId: "sess_oauth_1",
      userId: "user_1",
      workspaceId: "ws_1",
      expiresAt: "2026-02-08T00:00:00.000Z",
    },
    provider: "google",
    linkStatus: "linked_existing",
  };

  const result = mapOAuthCallbackState({
    query: callbackQuery("code=abc&state=xyz"),
    exchangeResponse: apiSuccess("corr_oauth", response),
  });

  assert.equal(result.status, "signed_in");
  assert.equal(result.redirectTo, "/dashboard");
  assert.equal(result.provider, "google");
  assert.equal(result.linkStatus, "linked_existing");
});

test("mapOAuthCallbackState maps auth_denied exchange to session_expired", () => {
  const result = mapOAuthCallbackState({
    query: callbackQuery("code=abc&state=xyz"),
    exchangeResponse: apiError("corr_oauth_2", "auth_denied", "Session invalid"),
  });

  assert.equal(result.status, "session_expired");
  assert.equal(result.retryable, true);
  assert.equal(result.redirectTo, "/sign-in");
});

test("extractOAuthCallbackDiagnostics captures provider error fields", () => {
  const diagnostics = extractOAuthCallbackDiagnostics(
    callbackQuery("error=temporarily_unavailable&error_description=Provider%20down"),
  );

  assert.equal(diagnostics.hasCode, false);
  assert.equal(diagnostics.hasState, false);
  assert.equal(diagnostics.providerErrorCode, "temporarily_unavailable");
  assert.equal(diagnostics.providerErrorDescription, "Provider down");
});
