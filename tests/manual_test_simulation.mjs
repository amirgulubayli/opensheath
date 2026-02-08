
const API_URL = "http://localhost:3000";

async function run() {
    console.log("Authenticating...");
    try {
        const authRes = await fetch(`${API_URL}/auth/sign-in`, {
            method: "POST",
            body: JSON.stringify({ email: "admin@example.com", password: "password123" }),
            headers: { "Content-Type": "application/json" }
        });

        console.log("Status:", authRes.status);
        const text = await authRes.text();
        console.log("Body:", text);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

run();
