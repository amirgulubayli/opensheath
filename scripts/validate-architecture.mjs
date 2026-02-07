import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SOURCE_ROOTS = [join(ROOT, "apps"), join(ROOT, "packages")];

const PACKAGE_RULES = {
  "@ethoxford/contracts": {
    allowed: new Set(),
  },
  "@ethoxford/domain": {
    allowed: new Set(["@ethoxford/contracts"]),
  },
  "@ethoxford/api": {
    allowed: new Set(["@ethoxford/contracts", "@ethoxford/domain"]),
  },
  "@ethoxford/web": {
    allowed: new Set(["@ethoxford/contracts"]),
  },
};

const IMPORT_PATTERN = /(?:import|export)\s+(?:[^"']+\s+from\s+)?["']([^"']+)["']/g;

function listTsFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...listTsFiles(path));
      continue;
    }

    if (path.endsWith(".ts")) {
      files.push(path);
    }
  }

  return files;
}

function readPackageNameFromFile(filePath) {
  const normalized = filePath.split(sep).join("/");
  if (normalized.includes("/packages/contracts/")) return "@ethoxford/contracts";
  if (normalized.includes("/packages/domain/")) return "@ethoxford/domain";
  if (normalized.includes("/apps/api/")) return "@ethoxford/api";
  if (normalized.includes("/apps/web/")) return "@ethoxford/web";
  return null;
}

function collectImports(content) {
  const imports = [];
  for (const match of content.matchAll(IMPORT_PATTERN)) {
    imports.push(match[1]);
  }
  return imports;
}

function detectCycles(graph) {
  const visiting = new Set();
  const visited = new Set();
  const cycles = [];

  function dfs(node, chain) {
    if (visiting.has(node)) {
      const start = chain.indexOf(node);
      cycles.push(chain.slice(start).concat(node));
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visiting.add(node);
    const neighbors = graph.get(node) ?? new Set();
    for (const neighbor of neighbors) {
      dfs(neighbor, chain.concat(neighbor));
    }

    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) {
    dfs(node, [node]);
  }

  return cycles;
}

const allFiles = SOURCE_ROOTS.flatMap((root) => listTsFiles(root));
const violations = [];
const packageGraph = new Map(
  Object.keys(PACKAGE_RULES).map((name) => [name, new Set()]),
);

for (const filePath of allFiles) {
  const packageName = readPackageNameFromFile(filePath);
  if (!packageName) {
    continue;
  }

  const content = readFileSync(filePath, "utf8");
  const imports = collectImports(content);

  for (const importPath of imports) {
    if (!importPath.startsWith("@ethoxford/")) {
      continue;
    }

    const targetPackage = importPath.split("/").slice(0, 2).join("/");

    if (targetPackage !== packageName) {
      packageGraph.get(packageName)?.add(targetPackage);
    }

    if (targetPackage === packageName) {
      continue;
    }

    const allowedSet = PACKAGE_RULES[packageName]?.allowed;
    if (!allowedSet?.has(targetPackage)) {
      violations.push(
        `${relative(ROOT, filePath)} imports ${targetPackage} but ${packageName} is not allowed to depend on it`,
      );
    }
  }
}

const cycles = detectCycles(packageGraph);
for (const cycle of cycles) {
  violations.push(`Dependency cycle detected: ${cycle.join(" -> ")}`);
}

if (violations.length > 0) {
  console.error("Architecture validation failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Architecture validation passed.");
