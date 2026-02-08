
import http from 'http';
import pg from 'pg';
import { randomUUID } from 'crypto';

const { Pool } = pg;
const API_HOST = "127.0.0.1";
const API_PORT = 4040;
const DATABASE_URL = "postgres://ethoxford:ethoxford@127.0.0.1:5432/ethoxford";

const pool = new Pool({
    connectionString: DATABASE_URL,
});

function request(method, path, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : {};
                    resolve({ status: res.statusCode, data: parsed, raw: data });
                } catch (e) {
                    resolve({ status: res.statusCode, error: "Invalid JSON", raw: data });
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function syncUserToPostgres(userId, email, workspaceId) {
    console.log(`Syncing user ${userId} and workspace ${workspaceId} to Postgres...`);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Ensure user exists
        await client.query(`
            INSERT INTO users (user_id, email)
            VALUES ($1, $2)
            ON CONFLICT (user_id) DO NOTHING
        `, [userId, email]);

        // Ensure workspace exists
        await client.query(`
            INSERT INTO workspaces (workspace_id, name, owner_user_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (workspace_id) DO NOTHING
        `, [workspaceId, "Test Workspace", userId]);

        // Ensure membership exists
        await client.query(`
            INSERT INTO workspace_memberships (membership_id, workspace_id, user_id, role)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (workspace_id, user_id) DO NOTHING
        `, [`mem_${randomUUID()}`, workspaceId, userId, "owner"]);

        await client.query('COMMIT');
        console.log("Sync complete.");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Sync failed:", e);
        throw e;
    } finally {
        client.release();
    }
}

async function run() {
    const report = {};
    console.log("Starting Backend Verification (HTTP module + PG Sync)...");

    try {
        // 1. Auth (Sign Up)
        console.log("[1] Authenticating (Sign Up)...");
        const email = `test.user.${Date.now()}@example.com`;
        const authRes = await request("POST", "/auth/sign-up", { email, password: "password123" });
        if (authRes.status !== 201 && authRes.status !== 200) {
            console.error("Auth failed", JSON.stringify(authRes, null, 2));
            process.exit(1);
        }
        console.log("Auth passed.");

        let session;
        try {
            if (!authRes.data || !authRes.data.data || !authRes.data.data.session) {
                throw new Error("Session invalid");
            }
            session = authRes.data.data.session;
        } catch (e) {
            console.error("Failed to extract session from payload", e);
            process.exit(1);
        }

        const authHeaders = { "x-session-id": session.sessionId || session.id };
        const workspaceId = session.workspaceId;
        const userId = session.userId;
        console.log("Authenticated. Workspace:", workspaceId, "UserId:", userId);
        report.auth = "PASS";

        // SYNC TO POSTGRES
        await syncUserToPostgres(userId, email, workspaceId);

        // 2. Create Project (Apollo)
        console.log("[2] Creating Apollo Project...");
        const apolloRes = await request("POST", "/ai/execute", {
            toolName: "project.create",
            toolInput: { name: "Apollo Project" }
        }, authHeaders);
        report.createProjectApollo = apolloRes.status === 200 ? "PASS" : "FAIL";
        if (apolloRes.status !== 200) console.log("Error createProjectApollo:", JSON.stringify(apolloRes.data, null, 2));

        // 3. Create Project (Borealis)
        console.log("[3] Creating Borealis Project...");
        const borealisRes = await request("POST", "/ai/execute", {
            toolName: "project.create",
            toolInput: { name: "Borealis Project" }
        }, authHeaders);
        report.createProjectBorealis = borealisRes.status === 200 ? "PASS" : "FAIL";

        // 4. Upload Document via tool
        console.log("[4] Creating Document...");
        const docRes = await request("POST", "/ai/execute", {
            toolName: "document.create",
            toolInput: { name: "Q1 Strategy Memo", source: "file://qa/q1-strategy.txt" }
        }, authHeaders);
        report.createDocument = docRes.status === 200 ? "PASS" : "FAIL";

        let documentId;
        if (docRes.status === 200) {
            // Inspect response heavily to find documentId
            // Usually: data.result.document.documentId OR data.data.document.documentId
            const payload = docRes.data.data || docRes.data; // payload inside apiSuccess wrapper
            // The response of 'execute' is { run, toolCall, output? }
            // So result is in payload.output?
            // Tool handler returns { document }.
            if (payload.output && payload.output.document) {
                documentId = payload.output.document.documentId;
            } else if (payload.document) {
                documentId = payload.document.documentId;
            } else if (payload.data && payload.data.document) {
                documentId = payload.data.document.documentId;
            }
        }

        if (documentId) {
            console.log("Document ID:", documentId);

            // 5. Index Chunks
            console.log("[5] Indexing Chunks...");
            const indexRes = await request("POST", "/retrieval/index-chunks", {
                documentId,
                sourceUri: "file://qa/q1-strategy.txt",
                sourceTitle: "Q1 Strategy Memo",
                embeddingModelVersion: "demo-v1",
                chunks: [
                    { text: "Apollo project kickoff.", chunkStartOffset: 0, chunkEndOffset: 20 }
                ]
            }, authHeaders);
            report.indexChunks = indexRes.status === 201 ? "PASS" : "FAIL";
            if (indexRes.status !== 201) console.log("Index fail:", JSON.stringify(indexRes.data, null, 2));
        } else {
            report.indexChunks = "SKIPPED";
            console.log("Skipping indexing because doc creation failed or ID not found. Response:", JSON.stringify(docRes.data, null, 2));
        }

        // 6. Query
        console.log("[6] Querying Retrieval...");
        const queryRes = await request("POST", "/ai/execute", {
            toolName: "retrieval.query",
            toolInput: { query: "Apollo" }
        }, authHeaders);
        report.retrievalQuery = queryRes.status === 200 ? "PASS" : "FAIL";

        // 7. Analytics (Check quota)
        console.log("[7] Checking Analytics/Quota...");
        const quotaRes = await request("GET", `/billing/quota?workspaceId=${workspaceId}&metric=monthly_ai_actions`, null, authHeaders);
        report.checkQuota = quotaRes.status === 200 ? "PASS" : "FAIL";

        // 8. Automation Rule
        console.log("[8] Creating Automation Rule...");
        const ruleRes = await request("POST", "/automation/rules/create", {
            eventType: "project.created",
            actionName: "notify.owner",
            maxRetries: 3
        }, authHeaders);
        report.createAutomationRule = (ruleRes.status === 201 || ruleRes.status === 200) ? "PASS" : "FAIL";

        // 9. Integrations
        console.log("[9] Registering Integration...");
        const intRes = await request("POST", "/integrations/connectors/register", {
            provider: "slack",
            authType: "oauth",
            credentialReference: "vault://demo"
        }, authHeaders);
        report.registerIntegration = (intRes.status === 201 || intRes.status === 200) ? "PASS" : "FAIL";

        // 10. Notifications
        console.log("[10] Updating Notifications...");
        const notifRes = await request("POST", "/notifications/preferences/update", {
            email: true,
            inApp: true,
            webhook: false
        }, authHeaders);
        report.updateNotifications = notifRes.status === 200 ? "PASS" : "FAIL";

        // 11. Webhooks
        console.log("[11] Enqueueing Webhook...");
        const hookRes = await request("POST", "/webhooks/outbound/enqueue", {
            targetUrl: "https://example.com/webhook",
            eventType: "test.event",
            eventId: "evt_test_123",
            payload: { foo: "bar" }
        }, authHeaders);
        report.enqueueWebhook = (hookRes.status === 201 || hookRes.status === 200) ? "PASS" : "FAIL";

        console.log("\n=== REPORT ===");
        console.log(JSON.stringify(report, null, 2));

    } catch (e) {
        console.error("Verification Script Error:", e);
    } finally {
        await pool.end();
    }
}

run();
