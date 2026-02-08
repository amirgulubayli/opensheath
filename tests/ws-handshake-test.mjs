import WebSocket from "ws";
import { randomUUID } from "crypto";

const ws = new WebSocket("ws://100.111.98.27:18790");
const connectId = "c-" + randomUUID().slice(0, 8);

ws.on("open", () => {
  console.log("WS open — sending connect handshake...");
  ws.send(
    JSON.stringify({
      type: "req",
      id: connectId,
      method: "connect",
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: "gateway-client",
          displayName: "EthOxford Middleware",
          version: "0.1.0",
          platform: process.platform,
          mode: "backend",
        },
        role: "operator",
        scopes: ["operator.admin"],
        caps: [],
        auth: { token: "6926c794baef57e9afe248638f1b48a93cc74d3a9ce27796" },
      },
    }),
  );
});

ws.on("message", (data) => {
  const frame = JSON.parse(String(data));
  console.log("RECV:", JSON.stringify(frame, null, 2).slice(0, 1000));
  if (frame.type === "res" && frame.id === connectId) {
    if (frame.ok) {
      console.log("\n🎉 === HANDSHAKE SUCCESS === 🎉\n");
    } else {
      console.log("\n❌ === HANDSHAKE FAILED ===", frame.error?.message, "\n");
    }
    ws.close();
    process.exit(frame.ok ? 0 : 1);
  }
});

ws.on("error", (e) => {
  console.log("ERROR:", e.message);
  process.exit(1);
});

setTimeout(() => {
  console.log("TIMEOUT");
  process.exit(1);
}, 15000);
