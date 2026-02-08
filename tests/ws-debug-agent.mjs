import WebSocket from "ws";
import { randomUUID } from "crypto";

const ws = new WebSocket("ws://100.111.98.27:18790");
const connectId = "c-" + randomUUID().slice(0, 8);
const agentId = "a-" + randomUUID().slice(0, 8);
let frameCount = 0;

ws.on("open", () => {
  console.log("WS open, connecting...");
  ws.send(JSON.stringify({
    type: "req", id: connectId, method: "connect",
    params: {
      minProtocol: 3, maxProtocol: 3,
      client: { id: "gateway-client", displayName: "Debug", version: "0.1.0", platform: process.platform, mode: "backend" },
      role: "operator", scopes: ["operator.admin"], caps: [],
      auth: { token: "6926c794baef57e9afe248638f1b48a93cc74d3a9ce27796" },
    },
  }));
});

ws.on("message", (data) => {
  frameCount++;
  const frame = JSON.parse(String(data));
  const preview = JSON.stringify(frame).slice(0, 600);
  console.log(`\n--- FRAME ${frameCount} (type=${frame.type} id=${frame.id} method=${frame.method}) ---`);
  console.log(preview);

  if (frame.type === "res" && frame.id === connectId && frame.ok) {
    console.log("\n=== CONNECTED! Sending agent message... ===");
    ws.send(JSON.stringify({
      type: "req", id: agentId, method: "agent",
      params: { sessionKey: "agent:main:main", message: "hi, briefly what tools do you have?", idempotencyKey: "idem-" + randomUUID() },
    }));
  }
});

ws.on("error", (e) => { console.error("ERROR:", e.message); process.exit(1); });
ws.on("close", () => { console.log(`\nWS closed after ${frameCount} frames`); process.exit(0); });
setTimeout(() => { console.log(`\nTIMEOUT after ${frameCount} frames`); ws.close(); }, 30000);
