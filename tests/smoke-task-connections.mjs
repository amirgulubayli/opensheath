// Quick smoke test for /openclaw/connections and /openclaw/task
async function main() {
  // Test 1: GET /openclaw/connections
  const connResp = await fetch("http://localhost:4040/openclaw/connections", {
    headers: {
      "x-workspace-id": "ethoxford-ws",
      "x-actor-role": "operator",
      "x-correlation-id": "test-conn",
    },
  });
  const conn = await connResp.json();
  console.log("=== /openclaw/connections ===");
  console.log("ok:", conn.ok);
  console.log("gateways:", conn.data?.gateways?.length);
  console.log("bindings:", conn.data?.bindings?.length);
  console.log("toolCatalog:", conn.data?.toolCatalog?.length);
  console.log("policyRules:", conn.data?.policyRules);
  console.log("healthy:", conn.data?.status?.healthy);
  console.log("gwOnline:", conn.data?.status?.gatewaysOnline + "/" + conn.data?.status?.gatewaysTotal);
  console.log("killSwitchesActive:", conn.data?.killSwitchesActive);
  console.log();

  // Test 2: POST /openclaw/task (single)
  const taskResp = await fetch("http://localhost:4040/openclaw/task", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-workspace-id": "ethoxford-ws",
      "x-actor-role": "operator",
      "x-correlation-id": "test-task",
    },
    body: JSON.stringify({ message: "hi, what can you do?" }),
  });
  const task = await taskResp.json();
  console.log("=== /openclaw/task (single) ===");
  console.log("ok:", task.ok);
  console.log("strategy:", task.data?.strategy);
  console.log("subtasks:", task.data?.subtasks?.length);
  console.log("totalDurationMs:", task.data?.totalDurationMs);
  console.log("reply preview:", (task.data?.reply ?? task.message ?? "").slice(0, 200));
  console.log();

  // Test 3: POST /openclaw/task (decomposed - multi-part)
  const multiResp = await fetch("http://localhost:4040/openclaw/task", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-workspace-id": "ethoxford-ws",
      "x-actor-role": "operator",
      "x-correlation-id": "test-multi",
    },
    body: JSON.stringify({ message: "1. list all your tools\n2. what integrations do you support?" }),
  });
  const multi = await multiResp.json();
  console.log("=== /openclaw/task (decomposed) ===");
  console.log("ok:", multi.ok);
  console.log("strategy:", multi.data?.strategy);
  console.log("subtasks:", multi.data?.subtasks?.length);
  if (multi.data?.subtasks) {
    for (const s of multi.data.subtasks) {
      console.log(`  - ${s.id}: ${s.status} (${s.durationMs}ms) ${s.description.slice(0, 60)}`);
    }
  }
  console.log("totalDurationMs:", multi.data?.totalDurationMs);
  console.log("reply preview:", (multi.data?.reply ?? multi.message ?? "").slice(0, 300));
}

main().catch(console.error);
