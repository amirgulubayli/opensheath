/**
 * Debug wrapper — starts the API server with full error/exit tracing.
 */
process.on("beforeExit", (code) => console.log("[debug] BEFORE_EXIT code:", code));
process.on("exit", (code) => console.log("[debug] EXIT code:", code));
process.on("uncaughtException", (e) => {
  console.error("[debug] UNCAUGHT EXCEPTION:", e);
  process.exit(99);
});
process.on("unhandledRejection", (r) => {
  console.error("[debug] UNHANDLED REJECTION:", r);
  process.exit(98);
});

console.log("[debug] importing server.ts …");

import { startApiServer } from "../apps/api/src/server.js";

console.log("[debug] calling startApiServer() …");
const server = startApiServer();
console.log("[debug] startApiServer() returned. Server ref should keep process alive.");

// Safety net — keep process alive with a heartbeat timer
const hb = setInterval(() => {
  console.log("[debug] heartbeat — server.listening =", server.listening);
}, 30_000);
hb.unref(); // don't prevent natural exit
