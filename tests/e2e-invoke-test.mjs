/**
 * End-to-end OpenClaw invocation test.
 * 
 * Steps:
 *  1. Register gateway with correct VPS token
 *  2. Bind workspace
 *  3. Catalog a tool
 *  4. Add allow policy
 *  5. Invoke tool through full middleware chain
 */

const BASE = "http://127.0.0.1:4040/openclaw";
const TOKEN = "6926c794baef57e9afe248638f1b48a93cc74d3a9ce27796";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  console.log(`POST ${path} → ${res.status}`, JSON.stringify(json).slice(0, 300));
  return { status: res.status, body: json };
}

async function main() {
  console.log("\n=== 1. Register Gateway ===");
  await post("/gateways", {
    id: "vps-openclaw",
    host: "100.111.98.27",
    port: 18790,
    authToken: TOKEN,
    authMode: "token",
    basePath: "",
    status: "active",
  });

  console.log("\n=== 2. Bind Workspace ===");
  await post("/bindings", {
    workspaceId: "ethoxford-ws",
    gatewayId: "vps-openclaw",
  });

  console.log("\n=== 3. Catalog Tool ===");
  await post("/tools/catalog", {
    tool: "sessions_list",
    description: "List all chat sessions",
    gatewayId: "vps-openclaw",
  });

  console.log("\n=== 4. Add Allow Policy ===");
  await post("/policy/rules", {
    id: "allow-operator",
    effect: "allow",
    tool: "sessions_list",
    roles: ["operator"],
    priority: 10,
  });

  console.log("\n=== 5. Invoke Tool (Full Middleware Chain) ===");
  const invoke = await post("/tools/invoke", {
    workspaceId: "ethoxford-ws",
    tool: "sessions_list",
    action: "json",
    args: {},
    actorId: "test-user",
    roles: ["operator"],
  });

  if (invoke.status === 200) {
    console.log("\n🎉🎉🎉 === FULL E2E SUCCESS === 🎉🎉🎉");
    console.log("Response body:", JSON.stringify(invoke.body, null, 2).slice(0, 500));
  } else {
    console.log("\n❌ Invocation returned status:", invoke.status);
    console.log("Body:", JSON.stringify(invoke.body, null, 2).slice(0, 500));
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
