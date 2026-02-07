import assert from "node:assert/strict";
import test from "node:test";
import type { AddressInfo } from "node:net";

import { AI_RUNTIME_ROLLBACK_RUNBOOK_PATH } from "./ai-observability.js";
import { AUTH_INCIDENT_RUNBOOK_PATH } from "./alerts.js";
import type { MetricsSnapshot } from "./observability.js";
import { InMemoryRequestMetrics, StructuredLogger } from "./observability.js";
import { createApiServer } from "./server.js";
import { TENANT_ISOLATION_RUNBOOK_PATH } from "./tenant-observability.js";

function createBaseUrl(port: number): string {
  return `http://127.0.0.1:${port}`;
}

async function listen(server: ReturnType<typeof createApiServer>): Promise<number> {
  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });

  const address = server.address();
  if (!address || typeof address !== "object") {
    throw new Error("Server did not bind to a TCP address");
  }

  return (address as AddressInfo).port;
}

test("server propagates request/correlation IDs and exposes structured metrics", async (t) => {
  const lines: string[] = [];
  const logger = new StructuredLogger("api", (line) => {
    lines.push(line);
  });
  const requestMetrics = new InMemoryRequestMetrics("api");
  const server = createApiServer({ logger, requestMetrics });
  t.after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  const port = await listen(server);
  const baseUrl = createBaseUrl(port);

  const healthResponse = await fetch(`${baseUrl}/health`, {
    headers: {
      "x-request-id": "req_test_1",
      "x-correlation-id": "corr_test_1",
      "x-session-id": "sess_test_1",
      "x-auth-method": "session",
    },
  });

  assert.equal(healthResponse.status, 200);
  assert.equal(healthResponse.headers.get("x-request-id"), "req_test_1");
  assert.equal(healthResponse.headers.get("x-correlation-id"), "corr_test_1");

  const metricsResponse = await fetch(`${baseUrl}/metrics`);
  assert.equal(metricsResponse.status, 200);

  const snapshot = (await metricsResponse.json()) as MetricsSnapshot;
  const healthRoute = snapshot.routes.find((route) => route.key === "GET /health");
  assert.equal(healthRoute?.count, 1);
  assert.equal(healthRoute?.errorCount, 0);
  assert.equal(healthRoute?.statusCodeCounts["200"], 1);

  const parsedLogs = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  const healthStartLog = parsedLogs.find(
    (entry) => entry.event === "request.start" && entry.path === "/health",
  );

  assert.equal(healthStartLog?.requestId, "req_test_1");
  assert.equal(healthStartLog?.correlationId, "corr_test_1");
  assert.equal(healthStartLog?.sessionId, "sess_test_1");
  assert.equal(healthStartLog?.authMethod, "session");
  assert.equal(typeof healthStartLog?.requestTimestamp, "string");
});

test("server records auth_denied failures in logs and metrics", async (t) => {
  const lines: string[] = [];
  const logger = new StructuredLogger("api", (line) => {
    lines.push(line);
  });
  const requestMetrics = new InMemoryRequestMetrics("api");
  const server = createApiServer({ logger, requestMetrics });
  t.after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  const port = await listen(server);
  const baseUrl = createBaseUrl(port);

  const deniedResponse = await fetch(`${baseUrl}/auth/me`, {
    headers: {
      "x-request-id": "req_test_2",
      "x-correlation-id": "corr_test_2",
    },
  });

  assert.equal(deniedResponse.status, 401);
  const deniedPayload = (await deniedResponse.json()) as {
    ok: boolean;
    code?: string;
  };
  assert.equal(deniedPayload.ok, false);
  assert.equal(deniedPayload.code, "auth_denied");

  const metricsResponse = await fetch(`${baseUrl}/metrics`);
  assert.equal(metricsResponse.status, 200);
  const snapshot = (await metricsResponse.json()) as MetricsSnapshot;

  const authMeRoute = snapshot.routes.find((route) => route.key === "GET /auth/me");
  assert.equal(authMeRoute?.count, 1);
  assert.equal(authMeRoute?.errorCount, 1);
  assert.equal(authMeRoute?.errorCodeCounts.auth_denied, 1);
  assert.equal(authMeRoute?.statusCodeCounts["401"], 1);

  assert.equal(snapshot.totals.auth.requestCount, 1);
  assert.equal(snapshot.totals.auth.failureCount, 1);
  assert.equal(snapshot.totals.auth.unauthorizedAttemptCount, 1);

  const alertsResponse = await fetch(
    `${baseUrl}/alerts/auth?minAuthRequests=1&p1FailureRate=0.5&p2UnauthorizedAttempts=1`,
  );
  assert.equal(alertsResponse.status, 200);
  const alertsPayload = (await alertsResponse.json()) as {
    alerts: Array<{
      code: string;
      runbook: string;
    }>;
  };
  assert.equal(alertsPayload.alerts.length, 2);
  assert.equal(alertsPayload.alerts[0]?.code, "auth_failure_rate_high");
  assert.equal(alertsPayload.alerts[0]?.runbook, AUTH_INCIDENT_RUNBOOK_PATH);
  assert.equal(alertsPayload.alerts[1]?.code, "unauthorized_attempt_spike");
  assert.equal(alertsPayload.alerts[1]?.runbook, AUTH_INCIDENT_RUNBOOK_PATH);

  const parsedLogs = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  const deniedLog = parsedLogs.find(
    (entry) => entry.event === "request.error" && entry.path === "/auth/me",
  );

  assert.equal(deniedLog?.statusCode, 401);
  assert.equal(deniedLog?.errorCode, "auth_denied");
  assert.equal(deniedLog?.denialClass, "auth_denied");
  assert.equal(deniedLog?.targetResource, "/auth/me");
});

test("server exposes AI runtime metrics and alerts with threshold wiring", async (t) => {
  const logger = new StructuredLogger("api", () => {
    // keep test output quiet while preserving logger wiring path
  });
  const requestMetrics = new InMemoryRequestMetrics("api");
  const server = createApiServer({ logger, requestMetrics });
  t.after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  const port = await listen(server);
  const baseUrl = createBaseUrl(port);

  const workspaceResponse = await fetch(`${baseUrl}/workspaces/create`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_workspace_create",
    },
    body: JSON.stringify({
      ownerUserId: "owner_ai",
      name: "AI Metrics Workspace",
    }),
  });
  assert.equal(workspaceResponse.status, 201);
  const workspacePayload = (await workspaceResponse.json()) as {
    ok: boolean;
    data?: {
      workspace: {
        workspaceId: string;
      };
    };
  };
  assert.equal(workspacePayload.ok, true);
  const workspaceId = workspacePayload.data?.workspace.workspaceId;
  assert.ok(workspaceId);

  const inviteResponse = await fetch(`${baseUrl}/workspaces/invite`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_workspace_invite",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "owner_ai",
      "x-roles": "owner",
    },
    body: JSON.stringify({
      workspaceId,
      email: "member@example.com",
      role: "member",
    }),
  });
  assert.equal(inviteResponse.status, 200);
  const invitePayload = (await inviteResponse.json()) as {
    ok: boolean;
    data?: {
      inviteToken: string;
    };
  };
  assert.equal(invitePayload.ok, true);

  const acceptInviteResponse = await fetch(`${baseUrl}/workspaces/accept-invite`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_workspace_accept",
    },
    body: JSON.stringify({
      inviteToken: invitePayload.data?.inviteToken,
      userId: "member_ai",
    }),
  });
  assert.equal(acceptInviteResponse.status, 200);

  const successResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_success",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "member_ai",
    },
    body: JSON.stringify({
      toolName: "echo",
      toolInput: { message: "ok" },
    }),
  });
  assert.equal(successResponse.status, 200);

  const blockedResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_blocked",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "member_ai",
    },
    body: JSON.stringify({
      toolName: "billing.cancel",
      toolInput: { message: "blocked" },
    }),
  });
  assert.equal(blockedResponse.status, 403);

  const failedResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_failed",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "member_ai",
    },
    body: JSON.stringify({
      toolName: "unknown.tool",
      toolInput: { message: "fail" },
    }),
  });
  assert.equal(failedResponse.status, 404);

  const aiMetricsResponse = await fetch(`${baseUrl}/metrics/ai?workspaceId=${workspaceId}`, {
    headers: {
      "x-correlation-id": "corr_ai_metrics",
      "x-actor-id": "owner_ai",
    },
  });
  assert.equal(aiMetricsResponse.status, 200);
  const aiMetrics = (await aiMetricsResponse.json()) as {
    runs: {
      totalCount: number;
      failedCount: number;
      blockedPolicyCount: number;
      failureRate: number;
      policyBlockRate: number;
    };
    dashboardNames: {
      runReliability: string;
      policySafety: string;
      tokenCost: string;
    };
  };

  assert.equal(aiMetrics.runs.totalCount, 3);
  assert.equal(aiMetrics.runs.failedCount, 1);
  assert.equal(aiMetrics.runs.blockedPolicyCount, 1);
  assert.equal(aiMetrics.runs.failureRate, 0.3333);
  assert.equal(aiMetrics.runs.policyBlockRate, 0.3333);
  assert.equal(aiMetrics.dashboardNames.runReliability, "ai-runtime-run-reliability-v1");

  const aiAlertsResponse = await fetch(
    `${baseUrl}/alerts/ai?workspaceId=${workspaceId}&minRunCount=1&p1RunFailureRate=0.3&p2PolicyBlockRate=0.3&p2ModerationBlockRate=0.9&p2SchemaMismatchRate=0.9&p2AverageCostPerRunUsd=1`,
    {
      headers: {
        "x-correlation-id": "corr_ai_alerts",
        "x-actor-id": "owner_ai",
      },
    },
  );
  assert.equal(aiAlertsResponse.status, 200);
  const aiAlerts = (await aiAlertsResponse.json()) as {
    alerts: Array<{
      code: string;
      runbook: string;
    }>;
  };

  const alertCodes = aiAlerts.alerts.map((alert) => alert.code);
  assert.equal(alertCodes.includes("run_failure_rate_high"), true);
  assert.equal(alertCodes.includes("policy_block_rate_high"), true);
  assert.equal(aiAlerts.alerts[0]?.runbook, AI_RUNTIME_ROLLBACK_RUNBOOK_PATH);
});

test("server executes core domain tools through AI runtime registry", async (t) => {
  const logger = new StructuredLogger("api", () => {
    // keep test output quiet while preserving logger wiring path
  });
  const requestMetrics = new InMemoryRequestMetrics("api");
  const server = createApiServer({ logger, requestMetrics });
  t.after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  const port = await listen(server);
  const baseUrl = createBaseUrl(port);

  const workspaceResponse = await fetch(`${baseUrl}/workspaces/create`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_tool_workspace_create",
    },
    body: JSON.stringify({
      ownerUserId: "owner_ai_tools",
      name: "AI Tool Workspace",
    }),
  });
  assert.equal(workspaceResponse.status, 201);
  const workspacePayload = (await workspaceResponse.json()) as {
    ok: boolean;
    data?: {
      workspace: {
        workspaceId: string;
      };
    };
  };
  assert.equal(workspacePayload.ok, true);
  const workspaceId = workspacePayload.data?.workspace.workspaceId;
  assert.ok(workspaceId);

  const createProjectResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_tool_project_create",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "owner_ai_tools",
    },
    body: JSON.stringify({
      toolName: "project.create",
      toolInput: {
        name: "AI Core Workflow",
        description: "created from tool registry",
      },
    }),
  });
  assert.equal(createProjectResponse.status, 200);
  const createProjectPayload = (await createProjectResponse.json()) as {
    ok: boolean;
    data?: {
      output?: {
        project?: {
          projectId: string;
          status: string;
        };
      };
    };
  };
  assert.equal(createProjectPayload.ok, true);
  const projectId = createProjectPayload.data?.output?.project?.projectId;
  assert.equal(createProjectPayload.data?.output?.project?.status, "draft");
  assert.ok(projectId);

  const updateProjectResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_tool_project_update",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "owner_ai_tools",
    },
    body: JSON.stringify({
      toolName: "project.update",
      toolInput: {
        projectId,
        description: "updated by tool",
      },
    }),
  });
  assert.equal(updateProjectResponse.status, 200);
  const updateProjectPayload = (await updateProjectResponse.json()) as {
    ok: boolean;
    data?: {
      output?: {
        project?: {
          description?: string;
        };
      };
    };
  };
  assert.equal(updateProjectPayload.ok, true);
  assert.equal(updateProjectPayload.data?.output?.project?.description, "updated by tool");

  const projectActivityResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_tool_project_activity",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "owner_ai_tools",
    },
    body: JSON.stringify({
      toolName: "project.activity",
      toolInput: {
        projectId,
      },
    }),
  });
  assert.equal(projectActivityResponse.status, 200);
  const projectActivityPayload = (await projectActivityResponse.json()) as {
    ok: boolean;
    data?: {
      output?: {
        events?: Array<{ eventType: string }>;
      };
    };
  };
  assert.equal(projectActivityPayload.ok, true);
  assert.equal(projectActivityPayload.data?.output?.events?.length !== 0, true);

  const transitionProjectResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_tool_project_transition",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "owner_ai_tools",
    },
    body: JSON.stringify({
      toolName: "project.transition",
      toolInput: {
        projectId,
        nextStatus: "active",
      },
    }),
  });
  assert.equal(transitionProjectResponse.status, 200);
  const transitionProjectPayload = (await transitionProjectResponse.json()) as {
    ok: boolean;
    data?: {
      output?: {
        project?: {
          status: string;
        };
      };
    };
  };
  assert.equal(transitionProjectPayload.ok, true);
  assert.equal(transitionProjectPayload.data?.output?.project?.status, "active");

  const createDocumentResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_tool_document_create",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "owner_ai_tools",
    },
    body: JSON.stringify({
      toolName: "document.create",
      toolInput: {
        name: "AI Runtime Contract",
        source: "https://docs.example.com/ai-runtime-contract",
      },
    }),
  });
  assert.equal(createDocumentResponse.status, 200);
  const createDocumentPayload = (await createDocumentResponse.json()) as {
    ok: boolean;
    data?: {
      output?: {
        document?: {
          documentId: string;
          workspaceId: string;
          status: string;
        };
      };
    };
  };
  assert.equal(createDocumentPayload.ok, true);
  assert.equal(createDocumentPayload.data?.output?.document?.workspaceId, workspaceId);
  assert.equal(createDocumentPayload.data?.output?.document?.status, "queued");
  const documentId = createDocumentPayload.data?.output?.document?.documentId;
  assert.ok(documentId);

  const processingResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_tool_document_processing",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "owner_ai_tools",
    },
    body: JSON.stringify({
      toolName: "document.processing",
      toolInput: {
        documentId,
      },
    }),
  });
  assert.equal(processingResponse.status, 200);

  const failResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_tool_document_fail",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "owner_ai_tools",
    },
    body: JSON.stringify({
      toolName: "document.fail",
      toolInput: {
        documentId,
        errorMessage: "parser_error",
      },
    }),
  });
  assert.equal(failResponse.status, 200);

  const retryResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_tool_document_retry",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "owner_ai_tools",
    },
    body: JSON.stringify({
      toolName: "document.retry",
      toolInput: {
        documentId,
      },
    }),
  });
  assert.equal(retryResponse.status, 200);

  const processingRetryResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_tool_document_processing_retry",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "owner_ai_tools",
    },
    body: JSON.stringify({
      toolName: "document.processing",
      toolInput: {
        documentId,
      },
    }),
  });
  assert.equal(processingRetryResponse.status, 200);

  const completeResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_tool_document_complete",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "owner_ai_tools",
    },
    body: JSON.stringify({
      toolName: "document.complete",
      toolInput: {
        documentId,
        chunkCount: 5,
      },
    }),
  });
  assert.equal(completeResponse.status, 200);

  const listResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_tool_document_list",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "owner_ai_tools",
    },
    body: JSON.stringify({
      toolName: "document.list",
      toolInput: {},
    }),
  });
  assert.equal(listResponse.status, 200);
  const listPayload = (await listResponse.json()) as {
    ok: boolean;
    data?: {
      output?: {
        documents?: Array<{ documentId: string }>;
      };
    };
  };
  assert.equal(listPayload.ok, true);
  assert.equal(listPayload.data?.output?.documents?.[0]?.documentId, documentId);

  const documentActivityResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_tool_document_activity",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "owner_ai_tools",
    },
    body: JSON.stringify({
      toolName: "document.activity",
      toolInput: {
        documentId,
      },
    }),
  });
  assert.equal(documentActivityResponse.status, 200);
  const documentActivityPayload = (await documentActivityResponse.json()) as {
    ok: boolean;
    data?: {
      output?: {
        events?: Array<{ eventType: string }>;
      };
    };
  };
  assert.equal(documentActivityPayload.ok, true);
  assert.equal(documentActivityPayload.data?.output?.events?.length !== 0, true);

  const indexChunksResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_tool_retrieval_index",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "owner_ai_tools",
    },
    body: JSON.stringify({
      toolName: "retrieval.index-chunks",
      toolInput: {
        documentId,
        sourceUri: "https://docs.example.com/ai-runtime-contract",
        sourceTitle: "AI Runtime Contract",
        embeddingModelVersion: "embed-v1",
        chunks: [
          {
            text: "AI runtime policies enforce safe tool execution.",
            chunkStartOffset: 0,
            chunkEndOffset: 48,
          },
        ],
      },
    }),
  });
  assert.equal(indexChunksResponse.status, 200);
  const indexChunksPayload = (await indexChunksResponse.json()) as {
    ok: boolean;
    data?: {
      output?: {
        indexed?: Array<{ chunkId: string }>;
      };
    };
  };
  assert.equal(indexChunksPayload.ok, true);
  const chunkId = indexChunksPayload.data?.output?.indexed?.[0]?.chunkId;
  assert.ok(chunkId);

  const queryResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_tool_retrieval_query",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "owner_ai_tools",
    },
    body: JSON.stringify({
      toolName: "retrieval.query",
      toolInput: {
        query: "runtime policies",
        method: "semantic",
        limit: 3,
      },
    }),
  });
  assert.equal(queryResponse.status, 200);
  const queryPayload = (await queryResponse.json()) as {
    ok: boolean;
    data?: {
      output?: {
        results?: Array<{ chunkId: string }>;
      };
    };
  };
  assert.equal(queryPayload.ok, true);
  assert.equal(queryPayload.data?.output?.results?.length !== 0, true);

  const recordCitationResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_tool_retrieval_citation",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "owner_ai_tools",
    },
    body: JSON.stringify({
      toolName: "retrieval.citations.record",
      toolInput: {
        agentRunId: "run_ai_tools",
        responseSegmentId: "segment_1",
        documentId,
        chunkId,
        evidenceType: "supporting",
        confidenceScore: 0.84,
      },
    }),
  });
  assert.equal(recordCitationResponse.status, 200);
  const recordCitationPayload = (await recordCitationResponse.json()) as {
    ok: boolean;
    data?: {
      output?: {
        citation?: { citationId: string };
      };
    };
  };
  assert.equal(recordCitationPayload.ok, true);
  assert.ok(recordCitationPayload.data?.output?.citation?.citationId);

  const listCitationResponse = await fetch(`${baseUrl}/ai/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_ai_tool_retrieval_citation_list",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "owner_ai_tools",
    },
    body: JSON.stringify({
      toolName: "retrieval.citations.list",
      toolInput: {
        agentRunId: "run_ai_tools",
      },
    }),
  });
  assert.equal(listCitationResponse.status, 200);
  const listCitationPayload = (await listCitationResponse.json()) as {
    ok: boolean;
    data?: {
      output?: {
        citations?: Array<{ citationId: string }>;
      };
    };
  };
  assert.equal(listCitationPayload.ok, true);
  assert.equal(listCitationPayload.data?.output?.citations?.length !== 0, true);
});

test("server enforces workspace membership for AI observability routes", async (t) => {
  const logger = new StructuredLogger("api", () => {
    // keep test output quiet while preserving logger wiring path
  });
  const requestMetrics = new InMemoryRequestMetrics("api");
  const server = createApiServer({ logger, requestMetrics });
  t.after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  const port = await listen(server);
  const baseUrl = createBaseUrl(port);

  const workspaceResponse = await fetch(`${baseUrl}/workspaces/create`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_observability_workspace_create",
    },
    body: JSON.stringify({
      ownerUserId: "owner_observability",
      name: "Observability Workspace",
    }),
  });
  assert.equal(workspaceResponse.status, 201);
  const workspacePayload = (await workspaceResponse.json()) as {
    ok: boolean;
    data?: {
      workspace: {
        workspaceId: string;
      };
    };
  };
  assert.equal(workspacePayload.ok, true);
  const workspaceId = workspacePayload.data?.workspace.workspaceId;
  assert.ok(workspaceId);

  const missingActorResponse = await fetch(`${baseUrl}/metrics/ai?workspaceId=${workspaceId}`);
  assert.equal(missingActorResponse.status, 401);

  const outsiderResponse = await fetch(`${baseUrl}/alerts/ai?workspaceId=${workspaceId}`, {
    headers: {
      "x-correlation-id": "corr_observability_outsider",
      "x-actor-id": "outsider_observability",
    },
  });
  assert.equal(outsiderResponse.status, 403);
});

test("server exposes tenant isolation metrics and threshold alerts", async (t) => {
  const logger = new StructuredLogger("api", () => {
    // keep test output quiet while preserving logger wiring path
  });
  const requestMetrics = new InMemoryRequestMetrics("api");
  const server = createApiServer({ logger, requestMetrics });
  t.after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  const port = await listen(server);
  const baseUrl = createBaseUrl(port);

  const workspaceResponse = await fetch(`${baseUrl}/workspaces/create`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_tenant_ws_create",
    },
    body: JSON.stringify({
      ownerUserId: "owner_tenant",
      name: "Tenant Metrics Workspace",
    }),
  });
  assert.equal(workspaceResponse.status, 201);
  const workspacePayload = (await workspaceResponse.json()) as {
    ok: boolean;
    data?: {
      workspace: {
        workspaceId: string;
      };
    };
  };
  assert.equal(workspacePayload.ok, true);
  const workspaceId = workspacePayload.data?.workspace.workspaceId;
  assert.ok(workspaceId);

  const inviteDeniedResponse = await fetch(`${baseUrl}/workspaces/invite`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_tenant_invite_denied",
      "x-workspace-id": workspaceId!,
      "x-actor-id": "outsider_tenant",
    },
    body: JSON.stringify({
      workspaceId,
      email: "member@example.com",
      role: "member",
    }),
  });
  assert.equal(inviteDeniedResponse.status, 403);

  const signInResponse = await fetch(`${baseUrl}/auth/sign-in`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "corr_tenant_signin",
    },
    body: JSON.stringify({
      email: "admin@example.com",
      password: "password123",
    }),
  });
  assert.equal(signInResponse.status, 200);
  const signInPayload = (await signInResponse.json()) as {
    ok: boolean;
    data?: {
      session: {
        sessionId: string;
      };
    };
  };
  assert.equal(signInPayload.ok, true);
  const sessionId = signInPayload.data?.session.sessionId;
  assert.ok(sessionId);

  const crossTenantResponse = await fetch(`${baseUrl}/ai/runs?workspaceId=${workspaceId}`, {
    headers: {
      "x-correlation-id": "corr_tenant_cross_tenant",
      "x-session-id": sessionId!,
    },
  });
  assert.equal(crossTenantResponse.status, 403);

  const tenantMetricsResponse = await fetch(`${baseUrl}/metrics/tenant`);
  assert.equal(tenantMetricsResponse.status, 200);
  const tenantMetrics = (await tenantMetricsResponse.json()) as {
    totals: {
      tenantRequestCount: number;
      deniedCount: number;
      policyDeniedCount: number;
      crossTenantDeniedCount: number;
      membershipDeniedCount: number;
      unauthorizedTenantRate: number;
    };
  };

  assert.equal(tenantMetrics.totals.tenantRequestCount >= 2, true);
  assert.equal(tenantMetrics.totals.deniedCount >= 2, true);
  assert.equal(tenantMetrics.totals.policyDeniedCount >= 2, true);
  assert.equal(tenantMetrics.totals.crossTenantDeniedCount >= 1, true);
  assert.equal(tenantMetrics.totals.membershipDeniedCount >= 1, true);
  assert.equal(tenantMetrics.totals.unauthorizedTenantRate > 0, true);

  const tenantAlertsResponse = await fetch(
    `${baseUrl}/alerts/tenant?minTenantRequests=1&p1CrossTenantDeniedCount=1&p2UnauthorizedTenantRate=0.1&p2WorkspaceLifecycleAnomalyRate=0.1&p2MembershipDeniedCount=1`,
  );
  assert.equal(tenantAlertsResponse.status, 200);
  const tenantAlerts = (await tenantAlertsResponse.json()) as {
    alerts: Array<{
      code: string;
      runbook: string;
    }>;
  };

  const alertCodes = tenantAlerts.alerts.map((alert) => alert.code);
  assert.equal(alertCodes.includes("cross_tenant_denial_detected"), true);
  assert.equal(alertCodes.includes("unauthorized_tenant_rate_high"), true);
  assert.equal(alertCodes.includes("membership_denial_spike"), true);
  assert.equal(tenantAlerts.alerts[0]?.runbook, TENANT_ISOLATION_RUNBOOK_PATH);
});

test("server disables billing routes when billing feature flag is off", async (t) => {
  const requestMetrics = new InMemoryRequestMetrics("api");
  const server = createApiServer({
    runtime: {
      port: 3000,
      nodeEnv: "test",
      appEnv: "local",
      enableAiFeatures: false,
      enableBilling: false,
    },
    requestMetrics,
  });
  t.after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  const port = await listen(server);
  const baseUrl = createBaseUrl(port);

  const response = await fetch(
    `${baseUrl}/billing/quota?workspaceId=ws_1&metric=monthly_ai_actions`,
    {
      headers: {
        "x-request-id": "req_test_3",
        "x-correlation-id": "corr_test_3",
      },
    },
  );

  assert.equal(response.status, 404);
  const payload = (await response.json()) as { ok: boolean; code?: string };
  assert.equal(payload.ok, false);
  assert.equal(payload.code, "not_found");

  const snapshot = requestMetrics.snapshot();
  const billingRoute = snapshot.routes.find((route) => route.key === "GET /billing/quota");
  assert.equal(billingRoute?.count, 1);
  assert.equal(billingRoute?.errorCount, 1);
  assert.equal(billingRoute?.errorCodeCounts.not_found, 1);
  assert.equal(billingRoute?.statusCodeCounts["404"], 1);
});
