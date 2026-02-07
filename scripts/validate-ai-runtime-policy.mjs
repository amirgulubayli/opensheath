import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const aiObservabilityPath = join(root, "apps", "api", "src", "ai-observability.ts");
const playbookPath = join(
  root,
  "docs",
  "05-engineering-playbooks",
  "ai-runtime-evals-and-rollback-playbook.md",
);

const requiredThresholdKeys = [
  "minRunCount",
  "p1RunFailureRate",
  "p2PolicyBlockRate",
  "p2ModerationBlockRate",
  "p2SchemaMismatchRate",
  "p2AverageCostPerRunUsd",
];

const requiredDashboardValues = {
  runReliability: "ai-runtime-run-reliability-v1",
  policySafety: "ai-runtime-policy-safety-v1",
  tokenCost: "ai-runtime-token-cost-v1",
};

const requiredAlertCodes = [
  "run_failure_rate_high",
  "policy_block_rate_high",
  "moderation_block_rate_high",
  "schema_mismatch_rate_high",
  "average_cost_per_run_high",
];

const requiredPlaybookSections = [
  "## Failure Taxonomy",
  "## Rollback Triggers",
  "## Minimum Thresholds by Stage",
];

const requiredFailureTaxonomyItems = [
  "schema_validation_failed",
  "policy_block_expected_but_not_triggered",
  "tenant_context_missing_or_invalid",
  "citation_missing_when_required",
  "unsafe_output_policy_violation",
  "tool_call_replayed_or_duplicated",
];

function fail(message) {
  console.error(`AI runtime policy validation failed: ${message}`);
  process.exit(1);
}

function extractConstObject(source, constName) {
  const pattern = new RegExp(
    `export const ${constName}:[^=]+=[\\s\\r\\n]*\\{([\\s\\S]*?)\\};`,
  );
  const match = source.match(pattern);
  if (!match) {
    fail(`Could not locate constant object "${constName}" in ai-observability source.`);
  }

  return match[1];
}

function parseNumericFields(objectLiteral) {
  const pairs = [...objectLiteral.matchAll(/^\s*([A-Za-z0-9_]+):\s*([0-9.]+),?\s*$/gm)];
  const output = new Map();

  for (const pair of pairs) {
    const key = pair[1];
    const value = Number(pair[2]);
    output.set(key, value);
  }

  return output;
}

function parseStringFields(objectLiteral) {
  const pairs = [...objectLiteral.matchAll(/^\s*([A-Za-z0-9_]+):\s*"([^"]+)",?\s*$/gm)];
  const output = new Map();

  for (const pair of pairs) {
    output.set(pair[1], pair[2]);
  }

  return output;
}

function validateThresholdObject(source) {
  const thresholdsBlock = extractConstObject(source, "DEFAULT_AI_ALERT_THRESHOLDS");
  const parsed = parseNumericFields(thresholdsBlock);

  for (const key of requiredThresholdKeys) {
    if (!parsed.has(key)) {
      fail(`Missing threshold key "${key}" in DEFAULT_AI_ALERT_THRESHOLDS.`);
    }
  }

  for (const key of [
    "p1RunFailureRate",
    "p2PolicyBlockRate",
    "p2ModerationBlockRate",
    "p2SchemaMismatchRate",
  ]) {
    const value = parsed.get(key);
    if (value < 0 || value > 1) {
      fail(`Threshold "${key}" must be within [0, 1], found ${value}.`);
    }
  }

  const minRunCount = parsed.get("minRunCount");
  if (!Number.isInteger(minRunCount) || minRunCount < 0) {
    fail(`Threshold "minRunCount" must be a non-negative integer, found ${minRunCount}.`);
  }

  const p2AverageCostPerRunUsd = parsed.get("p2AverageCostPerRunUsd");
  if (p2AverageCostPerRunUsd < 0) {
    fail(
      `Threshold "p2AverageCostPerRunUsd" must be non-negative, found ${p2AverageCostPerRunUsd}.`,
    );
  }
}

function validateDashboardNames(source) {
  const dashboardBlock = extractConstObject(source, "DEFAULT_AI_DASHBOARD_NAMES");
  const parsed = parseStringFields(dashboardBlock);

  for (const [key, expectedValue] of Object.entries(requiredDashboardValues)) {
    if (parsed.get(key) !== expectedValue) {
      fail(
        `Dashboard "${key}" expected "${expectedValue}" but found "${parsed.get(key) ?? "missing"}".`,
      );
    }
  }
}

function validateRunbookPath(source) {
  const match = source.match(
    /export const AI_RUNTIME_ROLLBACK_RUNBOOK_PATH\s*=\s*"([^"]+)";/,
  );

  if (!match) {
    fail("Could not locate AI_RUNTIME_ROLLBACK_RUNBOOK_PATH.");
  }

  const relativePath = match[1];
  const absolutePath = join(root, ...relativePath.split("/"));
  if (!existsSync(absolutePath)) {
    fail(`Runbook path does not exist: ${relativePath}`);
  }
}

function validateAlertCodes(source) {
  for (const code of requiredAlertCodes) {
    if (!source.includes(`"${code}"`)) {
      fail(`Missing alert code "${code}" in ai-observability definitions.`);
    }
  }
}

function validatePlaybook() {
  if (!existsSync(playbookPath)) {
    fail(`Expected playbook file is missing: ${playbookPath}`);
  }

  const playbook = readFileSync(playbookPath, "utf8");

  for (const section of requiredPlaybookSections) {
    if (!playbook.includes(section)) {
      fail(`Playbook missing required section: ${section}`);
    }
  }

  for (const taxonomyItem of requiredFailureTaxonomyItems) {
    if (!playbook.includes(taxonomyItem)) {
      fail(`Playbook missing failure taxonomy item: ${taxonomyItem}`);
    }
  }
}

if (!existsSync(aiObservabilityPath)) {
  fail(`Expected file is missing: ${aiObservabilityPath}`);
}

const aiObservabilitySource = readFileSync(aiObservabilityPath, "utf8");
validateThresholdObject(aiObservabilitySource);
validateDashboardNames(aiObservabilitySource);
validateRunbookPath(aiObservabilitySource);
validateAlertCodes(aiObservabilitySource);
validatePlaybook();

console.log("AI runtime policy validation passed.");
