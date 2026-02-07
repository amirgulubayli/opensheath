import assert from "node:assert/strict";
import test from "node:test";

import { apiError, apiSuccess } from "@ethoxford/contracts";

import { resolveEntitlementAccessState } from "./entitlement-gating.js";

test("resolveEntitlementAccessState returns enabled when feature and quota allow access", () => {
  const state = resolveEntitlementAccessState({
    featureResponse: apiSuccess("corr_ent_1", { enabled: true }),
    quotaResponse: apiSuccess("corr_ent_1", {
      quota: {
        allowed: true,
        remaining: 100,
      },
    }),
  });

  assert.equal(state.status, "enabled");
  assert.equal(state.retryable, false);
  assert.equal(state.remaining, 100);
});

test("resolveEntitlementAccessState returns degraded when quota is low", () => {
  const state = resolveEntitlementAccessState({
    featureResponse: apiSuccess("corr_ent_2", { enabled: true }),
    quotaResponse: apiSuccess("corr_ent_2", {
      quota: {
        allowed: true,
        remaining: 3,
      },
    }),
    lowRemainingThreshold: 5,
  });

  assert.equal(state.status, "degraded");
  assert.equal(state.message, "Usage quota is running low.");
});

test("resolveEntitlementAccessState returns upgrade_required when feature is disabled", () => {
  const state = resolveEntitlementAccessState({
    featureResponse: apiSuccess("corr_ent_3", { enabled: false }),
    quotaResponse: apiSuccess("corr_ent_3", {
      quota: {
        allowed: true,
        remaining: 20,
      },
    }),
  });

  assert.equal(state.status, "upgrade_required");
  assert.equal(state.retryable, false);
});

test("resolveEntitlementAccessState returns upgrade_required when quota is exhausted", () => {
  const state = resolveEntitlementAccessState({
    featureResponse: apiSuccess("corr_ent_4", { enabled: true }),
    quotaResponse: apiSuccess("corr_ent_4", {
      quota: {
        allowed: false,
        remaining: 0,
      },
    }),
  });

  assert.equal(state.status, "upgrade_required");
  assert.equal(state.remaining, 0);
});

test("resolveEntitlementAccessState returns recovery_required for missing billing state", () => {
  const state = resolveEntitlementAccessState({
    featureResponse: apiError("corr_ent_5", "not_found", "Subscription not found"),
  });

  assert.equal(state.status, "recovery_required");
  assert.equal(state.retryable, true);
});

test("resolveEntitlementAccessState returns error for generic failures", () => {
  const state = resolveEntitlementAccessState({
    quotaResponse: apiError("corr_ent_6", "unavailable", "Billing unavailable"),
  });

  assert.equal(state.status, "error");
  assert.equal(state.retryable, true);
});

test("resolveEntitlementAccessState returns error when no inputs are provided", () => {
  const state = resolveEntitlementAccessState({});

  assert.equal(state.status, "error");
  assert.equal(state.retryable, false);
});
