// Comprehensive smoke test for the OpenClaw orchestrator pipeline
// Tests: single relay, heuristic decomposition, tool invocation, error handling

const BASE = "http://localhost:4040";
const HEADERS = {
  "content-type": "application/json",
  "x-workspace-id": "ethoxford-ws",
  "x-actor-role": "operator",
};

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { ...HEADERS, "x-correlation-id": `test-${Date.now()}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...HEADERS, "x-correlation-id": `test-${Date.now()}` },
  });
  return res.json();
}

function assert(label, condition, detail) {
  const icon = condition ? "✅" : "❌";
  console.log(`  ${icon} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) process.exitCode = 1;
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  OpenClaw Orchestrator Smoke Test");
  console.log("═══════════════════════════════════════════════════\n");

  // ─── Test 1: Health & Connections ───
  console.log("── Test 1: Connections Overview ──");
  try {
    const conn = await get("/openclaw/connections");
    assert("Connections endpoint ok", conn.ok === true);
    assert("Has gateways", conn.data?.gateways?.length > 0, `${conn.data?.gateways?.length} gateways`);
    assert("System healthy", conn.data?.status?.healthy === true);
    assert("Has policy rules", conn.data?.policyRules > 0);
    assert("Has tool catalog", conn.data?.toolCatalog?.length > 0);
  } catch (e) {
    assert("Connections endpoint reachable", false, e.message);
  }
  console.log();

  // ─── Test 2: Single Task (no decomposition) ───
  console.log("── Test 2: Single Task (direct relay) ──");
  try {
    const t = await post("/openclaw/task", { message: "hello, who are you?" });
    assert("Task endpoint ok", t.ok === true);
    assert("Has reply", !!t.data?.reply, `${(t.data?.reply ?? "").slice(0, 80)}...`);
    assert("Strategy is single", t.data?.strategy === "single", t.data?.strategy);
    assert("Has subtasks array", Array.isArray(t.data?.subtasks));
    assert("Exactly 1 subtask", t.data?.subtasks?.length === 1);
    assert("Subtask completed", t.data?.subtasks?.[0]?.status === "completed");
    assert("Has totalDurationMs", typeof t.data?.totalDurationMs === "number", `${t.data?.totalDurationMs}ms`);
    assert("Has decompositionMethod", !!t.data?.decompositionMethod, t.data?.decompositionMethod);
    assert("Has synthesisMethod", !!t.data?.synthesisMethod, t.data?.synthesisMethod);
  } catch (e) {
    assert("Single task works", false, e.message);
  }
  console.log();

  // ─── Test 3: Multi-part Task (decomposed) ───
  console.log("── Test 3: Multi-part Task (decomposed) ──");
  try {
    const t = await post("/openclaw/task", {
      message: "1. what tools do you have available?\n2. what is 2+2?\n3. tell me a fun fact",
    });
    assert("Decomposed task ok", t.ok === true);
    assert("Has reply", !!t.data?.reply, `${(t.data?.reply ?? "").slice(0, 100)}...`);
    assert("Strategy is decomposed or hybrid", ["decomposed", "hybrid"].includes(t.data?.strategy), t.data?.strategy);
    assert("Multiple subtasks", t.data?.subtasks?.length >= 2, `${t.data?.subtasks?.length} subtasks`);
    assert("Has completedCount", typeof t.data?.completedCount === "number", `${t.data?.completedCount} completed`);
    assert("Has failedCount", typeof t.data?.failedCount === "number", `${t.data?.failedCount} failed`);

    if (t.data?.subtasks) {
      for (const s of t.data.subtasks) {
        const icon = s.status === "completed" ? "✅" : "❌";
        console.log(`    ${icon} [${s.type ?? "?"}] ${s.description.slice(0, 50)} — ${s.status} (${s.attempts ?? 1} attempt${(s.attempts ?? 1) > 1 ? "s" : ""}, ${s.durationMs}ms)`);
      }
    }
    assert("Total duration", typeof t.data?.totalDurationMs === "number", `${t.data?.totalDurationMs}ms`);
  } catch (e) {
    assert("Decomposed task works", false, e.message);
  }
  console.log();

  // ─── Test 4: Semicolon-separated compound request ───
  console.log("── Test 4: Compound Request (semicolons) ──");
  try {
    const t = await post("/openclaw/task", {
      message: "list your integrations; what is your name; how can I use you?",
    });
    assert("Compound task ok", t.ok === true);
    assert("Has reply", !!t.data?.reply);
    assert("Multiple subtasks or single", t.data?.subtasks?.length >= 1, `${t.data?.subtasks?.length} subtasks, strategy=${t.data?.strategy}`);
  } catch (e) {
    assert("Compound task works", false, e.message);
  }
  console.log();

  // ─── Test 5: Tool Invoke through middleware ───
  console.log("── Test 5: Tool Invoke (middleware chain) ──");
  try {
    const inv = await post("/openclaw/tools/invoke", {
      tool: "test_ping",
      action: "ping",
    });
    assert("Invoke ok", inv.ok === true);
    assert("Has invocation", !!inv.data?.invocation);
    assert("Policy decision", !!inv.data?.invocation?.policyDecision, inv.data?.invocation?.policyDecision);
    assert("Status", !!inv.data?.invocation?.status, inv.data?.invocation?.status);
  } catch (e) {
    assert("Tool invoke works", false, e.message);
  }
  console.log();

  // ─── Test 6: Chat relay (direct) ───
  console.log("── Test 6: Chat Relay (direct WebSocket) ──");
  try {
    const chat = await post("/openclaw/chat", { message: "ping" });
    assert("Chat ok", chat.ok === true);
    assert("Has reply", !!chat.data?.reply, `${(chat.data?.reply ?? "").slice(0, 80)}...`);
    assert("Has durationMs", typeof chat.data?.durationMs === "number", `${chat.data?.durationMs}ms`);
  } catch (e) {
    assert("Chat relay works", false, e.message);
  }
  console.log();

  // ─── Test 7: Gateways ───
  console.log("── Test 7: Gateway Management ──");
  try {
    const gws = await get("/openclaw/gateways");
    assert("Gateways ok", gws.ok === true);
    assert("Has gateways", gws.data?.gateways?.length > 0, `${gws.data?.gateways?.length} registered`);
  } catch (e) {
    assert("Gateways list works", false, e.message);
  }
  console.log();

  // ─── Test 8: Invocations history ───
  console.log("── Test 8: Invocation History ──");
  try {
    const hist = await get("/openclaw/invocations");
    assert("Invocations ok", hist.ok === true);
    assert("Has array", Array.isArray(hist.data?.invocations), `${hist.data?.invocations?.length} records`);
  } catch (e) {
    assert("Invocations list works", false, e.message);
  }
  console.log();

  console.log("═══════════════════════════════════════════════════");
  console.log(`  Done. Exit code: ${process.exitCode ?? 0}`);
  console.log("═══════════════════════════════════════════════════");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exitCode = 1;
});
