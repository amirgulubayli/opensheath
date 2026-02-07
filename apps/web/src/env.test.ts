import assert from "node:assert/strict";
import test from "node:test";

import { parseFrontendEnvironment } from "./env.js";

test("parseFrontendEnvironment parses valid values", () => {
  const env = parseFrontendEnvironment({
    APP_ENV: "staging",
    ENABLE_AI_FEATURES: "true",
    ENABLE_BILLING: "false",
  });

  assert.deepEqual(env, {
    appEnv: "staging",
    enableAiFeatures: true,
    enableBilling: false,
  });
});

test("parseFrontendEnvironment defaults optional booleans to false", () => {
  const env = parseFrontendEnvironment({
    APP_ENV: "local",
  });

  assert.deepEqual(env, {
    appEnv: "local",
    enableAiFeatures: false,
    enableBilling: false,
  });
});

test("parseFrontendEnvironment rejects invalid APP_ENV", () => {
  assert.throws(
    () =>
      parseFrontendEnvironment({
        APP_ENV: "sandbox",
      }),
    /APP_ENV must be one of/,
  );
});

test("parseFrontendEnvironment rejects invalid boolean values", () => {
  assert.throws(
    () =>
      parseFrontendEnvironment({
        APP_ENV: "preview",
        ENABLE_AI_FEATURES: "yes",
      }),
    /ENABLE_AI_FEATURES must be either/,
  );
});

