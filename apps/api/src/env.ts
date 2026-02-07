export type NodeEnvironment = "development" | "test" | "production";
export type AppEnvironment = "local" | "preview" | "staging" | "production";

export interface RuntimeConfig {
  port: number;
  nodeEnv: NodeEnvironment;
  appEnv: AppEnvironment;
  enableAiFeatures: boolean;
  enableBilling: boolean;
  databaseUrl?: string;
  openAiApiKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
}

function parseBoolean(value: string | undefined): boolean {
  return value === "true";
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return 3000;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return parsed;
}

function parseNodeEnv(value: string | undefined): NodeEnvironment {
  const resolved = value ?? "development";
  const allowed: NodeEnvironment[] = ["development", "test", "production"];

  if (!allowed.includes(resolved as NodeEnvironment)) {
    throw new Error("NODE_ENV must be development, test, or production");
  }

  return resolved as NodeEnvironment;
}

function parseAppEnv(value: string | undefined): AppEnvironment {
  const resolved = value ?? "local";
  const allowed: AppEnvironment[] = ["local", "preview", "staging", "production"];

  if (!allowed.includes(resolved as AppEnvironment)) {
    throw new Error("APP_ENV must be local, preview, staging, or production");
  }

  return resolved as AppEnvironment;
}

function requireWhenEnabled(
  enabled: boolean,
  value: string | undefined,
  key: string,
): string | undefined {
  if (!enabled) {
    return value;
  }

  if (!value || value.trim().length === 0) {
    throw new Error(`${key} is required when its feature is enabled`);
  }

  return value;
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const nodeEnv = parseNodeEnv(env.NODE_ENV);
  const appEnv = parseAppEnv(env.APP_ENV);
  const port = parsePort(env.PORT);
  const enableAiFeatures = parseBoolean(env.ENABLE_AI_FEATURES);
  const enableBilling = parseBoolean(env.ENABLE_BILLING);

  const openAiApiKey = requireWhenEnabled(
    enableAiFeatures,
    env.OPENAI_API_KEY,
    "OPENAI_API_KEY",
  );

  const stripeSecretKey = requireWhenEnabled(
    enableBilling,
    env.STRIPE_SECRET_KEY,
    "STRIPE_SECRET_KEY",
  );
  const stripeWebhookSecret = requireWhenEnabled(
    enableBilling,
    env.STRIPE_WEBHOOK_SECRET,
    "STRIPE_WEBHOOK_SECRET",
  );

  const databaseUrl = env.DATABASE_URL?.trim();

  return {
    port,
    nodeEnv,
    appEnv,
    enableAiFeatures,
    enableBilling,
    ...(databaseUrl ? { databaseUrl } : {}),
    ...(openAiApiKey ? { openAiApiKey } : {}),
    ...(stripeSecretKey ? { stripeSecretKey } : {}),
    ...(stripeWebhookSecret ? { stripeWebhookSecret } : {}),
  };
}
