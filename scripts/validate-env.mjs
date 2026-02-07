import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const examplePath = join(root, ".env.example");

const requiredKeys = [
  "PORT",
  "NODE_ENV",
  "APP_ENV",
  "ENABLE_AI_FEATURES",
  "OPENAI_API_KEY",
  "ENABLE_BILLING",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

function parseEnvExample(content) {
  const keys = new Set();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const idx = line.indexOf("=");
    if (idx === -1) {
      continue;
    }

    keys.add(line.slice(0, idx).trim());
  }

  return keys;
}

function ensureRuntimeRequirements() {
  const aiEnabled = process.env.ENABLE_AI_FEATURES === "true";
  const billingEnabled = process.env.ENABLE_BILLING === "true";

  if (aiEnabled && !process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when ENABLE_AI_FEATURES=true");
  }

  if (billingEnabled && !process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is required when ENABLE_BILLING=true");
  }

  if (billingEnabled && !process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is required when ENABLE_BILLING=true");
  }
}

const exampleContent = readFileSync(examplePath, "utf8");
const keys = parseEnvExample(exampleContent);

const missing = requiredKeys.filter((key) => !keys.has(key));
if (missing.length > 0) {
  console.error(".env.example is missing required keys:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

ensureRuntimeRequirements();
console.log("Environment validation passed.");
