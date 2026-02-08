/**
 * Direct test: HTTP POST /tools/invoke against the real VPS gateway.
 * 
 * The OpenClaw gateway exposes POST /tools/invoke on the same port as
 * the WebSocket endpoint. Auth via Authorization: Bearer <token>.
 */

const VPS_HOST = "100.111.98.27";
const VPS_PORT = 18790;
const GATEWAY_TOKEN = "6926c794baef57e9afe248638f1b48a93cc74d3a9ce27796";

async function testToolsInvoke() {
  const url = `http://${VPS_HOST}:${VPS_PORT}/tools/invoke`;
  
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  HTTP /tools/invoke Test — Direct VPS Gateway");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`URL: ${url}`);
  console.log();

  const body = {
    tool: "sessions_list",
    action: "json",
    args: {},
    sessionKey: "main",
  };

  console.log("Request body:", JSON.stringify(body, null, 2));
  console.log();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    console.log(`HTTP Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get("content-type")}`);
    
    const text = await response.text();
    console.log();
    
    try {
      const json = JSON.parse(text);
      console.log("Response (JSON):", JSON.stringify(json, null, 2).slice(0, 2000));
      
      if (json.ok) {
        console.log();
        console.log("🎉 SUCCESS! Tool invocation worked via HTTP /tools/invoke!");
      } else {
        console.log();
        console.log("⚠️  Gateway returned ok=false:", json.error?.message || JSON.stringify(json.error));
      }
    } catch {
      console.log("Response (raw):", text.slice(0, 2000));
    }
  } catch (err) {
    console.error("❌ Request failed:", err.message);
  }
}

testToolsInvoke();
