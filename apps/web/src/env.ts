export type AppEnvironment = "local" | "preview" | "staging" | "production";

export interface FrontendEnvironment {
  appEnv: AppEnvironment;
  enableAiFeatures: boolean;
  enableBilling: boolean;
}

export interface FrontendEnvironmentInput {
  APP_ENV?: string;
  ENABLE_AI_FEATURES?: string;
  ENABLE_BILLING?: string;
}

const APP_ENVIRONMENTS: readonly AppEnvironment[] = [
  "local",
  "preview",
  "staging",
  "production",
];

function parseBoolean(name: string, value: string | undefined): boolean {
  if (value === undefined || value.trim() === "") {
    return false;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`${name} must be either "true" or "false"`);
}

export function parseFrontendEnvironment(
  input: FrontendEnvironmentInput,
): FrontendEnvironment {
  const appEnvValue = input.APP_ENV ?? "local";

  if (!APP_ENVIRONMENTS.includes(appEnvValue as AppEnvironment)) {
    throw new Error(`APP_ENV must be one of: ${APP_ENVIRONMENTS.join(", ")}`);
  }

  return {
    appEnv: appEnvValue as AppEnvironment,
    enableAiFeatures: parseBoolean(
      "ENABLE_AI_FEATURES",
      input.ENABLE_AI_FEATURES,
    ),
    enableBilling: parseBoolean("ENABLE_BILLING", input.ENABLE_BILLING),
  };
}

