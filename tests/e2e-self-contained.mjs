/**
 * Self-contained E2E test: starts its own server, runs tests, then exits.
 */
import { startApiServer } from "../apps/api/src/server.ts";

const server = startApiServer();

// Wait for server to be ready
await new Promise((resolve) => setTimeout(resolve, 2000));

const BASE = "http://127.0.0.1:4040/openclaw";
const TOKEN = "6926c794baef57e9afe248638f1b48a93cc74d3a9ce27796";
const WORKSPACE_ID = "ethoxford-ws";

const defaultHeaders = {
  "Content-Type": "application/json",
  "x-workspace-id": WORKSPACE_ID,
  "x-actor-role": "operator",
};

async function post(path, body, extraHeaders = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { ...defaultHeaders, ...extraHeaders },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  console.log(`POST ${path} -> ${res.status}`, JSON.stringify(json).slice(0, 500));
  return { status: res.status, body: json };
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-workspace-id": WORKSPACE_ID, "x-actor-role": "operator" },
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  console.log(`GET  ${path} -> ${res.status}`, JSON.stringify(json).slice(0, 300));
  return { status: res.status, body: json };
}

try {
  // Step 1: Register Gateway
  console.log("\n=== 1. Register Gateway ===");
  const gwRes = await post("/gateways", {
    environment: "production",
    host: "100.111.98.27",
    port: 18790,
    tokenRef: TOKEN,
    authMode: "token",
    basePath: "",
    loopbackOnly: false,
  });
  const gatewayId = gwRes.body?.data?.gatewayId;
  console.log("  gatewayId:", gatewayId);

  // Step 2: Bind Workspace
  console.log("\n=== 2. Bind Workspace ===");
  await post("/bindings", {
    workspaceId: WORKSPACE_ID,
    gatewayId,
  });

  // Step 3: Catalog Tool
  console.log("\n=== 3. Catalog Tool (sessions_list) ===");
  await post("/tools/catalog", {
    toolName: "sessions_list",
    gatewayId,
    riskTier: 1,
    description: "List all chat sessions",
  });

  // Step 4: Add Allow Policy
  console.log("\n=== 4. Add Policy Rule ===");
  await post("/policy/rules", {
    workspaceId: WORKSPACE_ID,
    role: "operator",
    toolName: "sessions_list",
    decision: "allow",
  });

  // Step 5: Evaluate Policy (dry run)
  console.log("\n=== 5. Policy Evaluate (dry run) ===");
  await post("/policy/evaluate", {
    workspaceId: WORKSPACE_ID,
    toolName: "sessions_list",
  });

  // Step 6: Invoke Tool (Full Middleware Chain to Real VPS)
  console.log("\n=== 6. INVOKE TOOL (Full Middleware Chain to Real VPS) ===");
  const invoke = await post("/tools/invoke", {
    tool: "sessions_list",
    action: "json",
    args: {},
  });

  if (invoke.status === 200) {
    console.log("\n>>> FULL E2E SUCCESS <<<");
    console.log("Response:", JSON.stringify(invoke.body, null, 2).slice(0, 1000));
  } else {
    console.log("\nInvocation status:", invoke.status);
    console.log("Response:", JSON.stringify(invoke.body, null, 2).slice(0, 1000));
  }

  // Step 7: Check Audit Trail
  console.log("\n=== 7. Audit Trail ===");
  await get("/audit");

  // Step 8: Check Metrics
  console.log("\n=== 8. Metrics ===");
  await get("/metrics");

  // Step 9: Kill Switch Status
  console.log("\n=== 9. Kill Switch Status ===");
  await get("/killswitch/status");

} catch (err) {
  console.error("FATAL:", err);
} finally {
  server.close();
  setTimeout(() => process.exit(0), 500);
}
