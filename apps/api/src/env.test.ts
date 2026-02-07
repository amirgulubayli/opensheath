import assert from "node:assert/strict";
import { test } from "node:test";

import { loadRuntimeConfig } from "./env.js";

test("loadRuntimeConfig defaults to local settings", () => {
  const config = loadRuntimeConfig({});

  assert.equal(config.port, 3000);
  assert.equal(config.nodeEnv, "development");
  assert.equal(config.appEnv, "local");
  assert.equal(config.enableAiFeatures, false);
  assert.equal(config.enableBilling, false);
});

test("loadRuntimeConfig rejects invalid port", () => {
  assert.throws(
    () => loadRuntimeConfig({ PORT: "70000" }),
    /PORT must be an integer between 1 and 65535/,
  );
});

test("loadRuntimeConfig requires AI key when AI feature is enabled", () => {
  assert.throws(
    () => loadRuntimeConfig({ ENABLE_AI_FEATURES: "true" }),
    /OPENAI_API_KEY is required/,
  );
});

test("loadRuntimeConfig requires Stripe keys when billing is enabled", () => {
  assert.throws(
    () => loadRuntimeConfig({ ENABLE_BILLING: "true" }),
    /STRIPE_SECRET_KEY is required/,
  );

  assert.throws(
    () =>
      loadRuntimeConfig({
        ENABLE_BILLING: "true",
        STRIPE_SECRET_KEY: "sk_test_123",
      }),
    /STRIPE_WEBHOOK_SECRET is required/,
  );
});

test("loadRuntimeConfig accepts enabled feature keys", () => {
  const config = loadRuntimeConfig({
    ENABLE_AI_FEATURES: "true",
    OPENAI_API_KEY: "sk-openai",
    ENABLE_BILLING: "true",
    STRIPE_SECRET_KEY: "sk-stripe",
    STRIPE_WEBHOOK_SECRET: "whsec",
  });

  assert.equal(config.enableAiFeatures, true);
  assert.equal(config.enableBilling, true);
});
