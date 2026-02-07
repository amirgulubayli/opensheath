import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryAgentRuntimeService,
  InMemoryAutomationEngine,
  InMemoryAuthService,
  InMemoryBillingService,
  InMemoryConnectorService,
  InMemoryEventBus,
  InMemoryIngestionService,
  InMemoryNotificationPreferenceService,
  InMemoryProjectService,
  InMemoryRetrievalService,
  InMemoryWebhookDeliveryService,
  InMemoryToolRegistry,
  InMemoryWorkspaceService,
  ReleaseReadinessService,
} from "@ethoxford/domain";

import { handleRequest, type AppDependencies } from "./app.js";

function defaultHeaders(overrides?: Record<string, string>): Record<string, string> {
  return {
    "x-correlation-id": "corr_test",
    ...overrides,
  };
}

function createDependencies(): AppDependencies {
  const toolRegistry = new InMemoryToolRegistry();
  toolRegistry.register({
    name: "echo",
    version: "v1",
    riskClass: "low",
    requiredRoles: ["member", "admin", "owner"],
    handler: async (input) => ({ echoed: input }),
  });
  toolRegistry.register({
    name: "billing.cancel",
    version: "v1",
    riskClass: "high",
    requiredRoles: ["owner"],
    handler: async () => ({ canceled: true }),
  });

  const billingService = new InMemoryBillingService();
  billingService.setEntitlementPolicy({
    planId: "free",
    features: { ai_actions: true },
    quotas: { monthly_ai_actions: 5 },
  });
  const automationEngine = new InMemoryAutomationEngine();
  automationEngine.registerAction("noop", async () => {});
  automationEngine.registerAction("notify", async () => {});

  return {
    authService: new InMemoryAuthService(),
    workspaceService: new InMemoryWorkspaceService(),
    projectService: new InMemoryProjectService(),
    ingestionService: new InMemoryIngestionService(),
    retrievalService: new InMemoryRetrievalService(),
    eventBus: new InMemoryEventBus(),
    automationEngine,
    connectorService: new InMemoryConnectorService(),
    notificationPreferenceService: new InMemoryNotificationPreferenceService(),
    webhookDeliveryService: new InMemoryWebhookDeliveryService(),
    agentRuntimeService: new InMemoryAgentRuntimeService(toolRegistry),
    billingService,
    releaseReadinessService: new ReleaseReadinessService(),
  };
}

async function createWorkspaceForActor(
  dependencies: AppDependencies,
  ownerUserId: string,
  name = "Workspace",
): Promise<string> {
  const workspaceResult = await handleRequest(
    {
      method: "POST",
      url: "/workspaces/create",
      headers: defaultHeaders(),
      body: JSON.stringify({
        ownerUserId,
        name,
      }),
    },
    dependencies,
  );

  assert.equal(workspaceResult.statusCode, 201);
  assert.equal(workspaceResult.payload.ok, true);

  if (!workspaceResult.payload.ok) {
    throw new Error("Expected workspace creation success");
  }

  return (
    workspaceResult.payload.data as {
      workspace: {
        workspaceId: string;
      };
    }
  ).workspace.workspaceId;
}

test("GET /health returns contract-compliant health payload", async () => {
  const result = await handleRequest(
    {
      method: "GET",
      url: "/health",
      headers: defaultHeaders(),
      body: "",
    },
    createDependencies(),
  );

  assert.equal(result.statusCode, 200);
  assert.equal(result.payload.ok, true);

  if (result.payload.ok) {
    const data = result.payload.data as { service: string; status: string };
    assert.equal(data.service, "api");
    assert.equal(data.status, "ok");
  }
});

test("auth flow sign-in then /auth/me returns session", async () => {
  const dependencies = createDependencies();

  const signInResult = await handleRequest(
    {
      method: "POST",
      url: "/auth/sign-in",
      headers: defaultHeaders(),
      body: JSON.stringify({
        email: "admin@example.com",
        password: "password123",
      }),
    },
    dependencies,
  );

  assert.equal(signInResult.statusCode, 200);
  assert.equal(signInResult.payload.ok, true);

  if (!signInResult.payload.ok) {
    throw new Error("Expected sign-in success");
  }

  const sessionId = (signInResult.payload.data as { session: { sessionId: string } }).session
    .sessionId;

  const meResult = await handleRequest(
    {
      method: "GET",
      url: "/auth/me",
      headers: {
        ...defaultHeaders(),
        "x-session-id": sessionId,
      },
      body: "",
    },
    dependencies,
  );

  assert.equal(meResult.statusCode, 200);
  assert.equal(meResult.payload.ok, true);
});

test("auth sign-up, refresh, and oauth exchange routes are contract-compliant", async () => {
  const dependencies = createDependencies();

  const signUpResult = await handleRequest(
    {
      method: "POST",
      url: "/auth/sign-up",
      headers: defaultHeaders(),
      body: JSON.stringify({
        email: "new-user@example.com",
        password: "password123",
        workspaceId: "ws_signup",
      }),
    },
    dependencies,
  );

  assert.equal(signUpResult.statusCode, 201);
  assert.equal(signUpResult.payload.ok, true);
  if (!signUpResult.payload.ok) {
    throw new Error("Expected sign-up success");
  }

  const signUpSession = (
    signUpResult.payload.data as {
      session: {
        sessionId: string;
      };
    }
  ).session;

  const refreshResult = await handleRequest(
    {
      method: "POST",
      url: "/auth/session/refresh",
      headers: defaultHeaders({
        "x-session-id": signUpSession.sessionId,
      }),
      body: "",
    },
    dependencies,
  );

  assert.equal(refreshResult.statusCode, 200);
  assert.equal(refreshResult.payload.ok, true);
  if (!refreshResult.payload.ok) {
    throw new Error("Expected session refresh success");
  }

  const refreshed = refreshResult.payload.data as {
    session: {
      sessionId: string;
    };
    rotatedFromSessionId: string;
  };
  assert.notEqual(refreshed.session.sessionId, signUpSession.sessionId);
  assert.equal(refreshed.rotatedFromSessionId, signUpSession.sessionId);

  const oldSessionResult = await handleRequest(
    {
      method: "GET",
      url: "/auth/me",
      headers: defaultHeaders({
        "x-session-id": signUpSession.sessionId,
      }),
      body: "",
    },
    dependencies,
  );
  assert.equal(oldSessionResult.statusCode, 401);
  assert.equal(oldSessionResult.payload.ok, false);

  const oauthLinkedResult = await handleRequest(
    {
      method: "POST",
      url: "/auth/oauth/exchange",
      headers: defaultHeaders(),
      body: JSON.stringify({
        provider: "google",
        authorizationCode: "code_1",
        state: "state_1",
        email: "admin@example.com",
        providerAccountId: "google_usr_1",
      }),
    },
    dependencies,
  );
  assert.equal(oauthLinkedResult.statusCode, 200);
  assert.equal(oauthLinkedResult.payload.ok, true);
  if (!oauthLinkedResult.payload.ok) {
    throw new Error("Expected OAuth exchange success for linked identity");
  }

  const linked = oauthLinkedResult.payload.data as {
    provider: string;
    linkStatus: string;
  };
  assert.equal(linked.provider, "google");
  assert.equal(linked.linkStatus, "linked_existing");

  const oauthCreatedResult = await handleRequest(
    {
      method: "POST",
      url: "/auth/oauth/exchange",
      headers: defaultHeaders(),
      body: JSON.stringify({
        provider: "github",
        authorizationCode: "code_2",
        state: "state_2",
        email: "oauth-new-user@example.com",
        providerAccountId: "github_usr_99",
      }),
    },
    dependencies,
  );
  assert.equal(oauthCreatedResult.statusCode, 200);
  assert.equal(oauthCreatedResult.payload.ok, true);
  if (!oauthCreatedResult.payload.ok) {
    throw new Error("Expected OAuth exchange success for new identity");
  }

  const created = oauthCreatedResult.payload.data as {
    linkStatus: string;
    session: {
      userId: string;
    };
  };
  assert.equal(created.linkStatus, "created_new");
  assert.equal(created.session.userId.startsWith("usr_"), true);
});

test("workspace and project routes run end-to-end", async () => {
  const dependencies = createDependencies();

  const workspaceResult = await handleRequest(
    {
      method: "POST",
      url: "/workspaces/create",
      headers: defaultHeaders(),
      body: JSON.stringify({
        ownerUserId: "owner_1",
        name: "Acme",
      }),
    },
    dependencies,
  );

  assert.equal(workspaceResult.statusCode, 201);
  assert.equal(workspaceResult.payload.ok, true);

  if (!workspaceResult.payload.ok) {
    throw new Error("Expected workspace creation success");
  }

  const workspaceId = (
    workspaceResult.payload.data as {
      workspace: {
        workspaceId: string;
      };
    }
  ).workspace.workspaceId;

  const projectResult = await handleRequest(
    {
      method: "POST",
      url: "/projects/create",
      headers: defaultHeaders({
        "x-actor-id": "owner_1",
        "x-workspace-id": workspaceId,
      }),
      body: JSON.stringify({
        name: "Roadmap",
      }),
    },
    dependencies,
  );

  assert.equal(projectResult.statusCode, 201);
  assert.equal(projectResult.payload.ok, true);

  if (!projectResult.payload.ok) {
    throw new Error("Expected project creation success");
  }

  const projectId = (
    projectResult.payload.data as {
      project: {
        projectId: string;
      };
    }
  ).project.projectId;

  const updateResult = await handleRequest(
    {
      method: "POST",
      url: "/projects/update",
      headers: defaultHeaders({
        "x-actor-id": "owner_1",
        "x-workspace-id": workspaceId,
      }),
      body: JSON.stringify({
        projectId,
        name: "Roadmap v2",
      }),
    },
    dependencies,
  );

  assert.equal(updateResult.statusCode, 200);
  assert.equal(updateResult.payload.ok, true);

  const listResult = await handleRequest(
    {
      method: "GET",
      url: `/projects/list?workspaceId=${workspaceId}`,
      headers: defaultHeaders({
        "x-actor-id": "owner_1",
        "x-workspace-id": workspaceId,
      }),
      body: "",
    },
    dependencies,
  );

  assert.equal(listResult.statusCode, 200);
  assert.equal(listResult.payload.ok, true);

  const transitionResult = await handleRequest(
    {
      method: "POST",
      url: "/projects/transition",
      headers: defaultHeaders({
        "x-actor-id": "owner_1",
        "x-workspace-id": workspaceId,
      }),
      body: JSON.stringify({
        projectId,
        nextStatus: "active",
      }),
    },
    dependencies,
  );

  assert.equal(transitionResult.statusCode, 200);
  assert.equal(transitionResult.payload.ok, true);

  const activityResult = await handleRequest(
    {
      method: "GET",
      url: `/projects/activity?projectId=${projectId}`,
      headers: defaultHeaders({
        "x-actor-id": "owner_1",
        "x-workspace-id": workspaceId,
      }),
      body: "",
    },
    dependencies,
  );

  assert.equal(activityResult.statusCode, 200);
  assert.equal(activityResult.payload.ok, true);
});

test("document activity endpoint returns timeline", async () => {
  const dependencies = createDependencies();
  const workspaceId = await createWorkspaceForActor(dependencies, "owner_2", "Docs");

  const createResult = await handleRequest(
    {
      method: "POST",
      url: "/documents/create",
      headers: defaultHeaders({
        "x-actor-id": "owner_2",
        "x-workspace-id": workspaceId,
      }),
      body: JSON.stringify({
        name: "Launch Plan",
        source: "launch-plan.pdf",
      }),
    },
    dependencies,
  );

  assert.equal(createResult.statusCode, 201);
  assert.equal(createResult.payload.ok, true);

  if (!createResult.payload.ok) {
    throw new Error("Expected document creation success");
  }

  const documentId = (
    createResult.payload.data as {
      document: {
        documentId: string;
      };
    }
  ).document.documentId;

  const activityResult = await handleRequest(
    {
      method: "GET",
      url: `/documents/activity?documentId=${documentId}`,
      headers: defaultHeaders({
        "x-actor-id": "owner_2",
        "x-workspace-id": workspaceId,
      }),
      body: "",
    },
    dependencies,
  );

  assert.equal(activityResult.statusCode, 200);
  assert.equal(activityResult.payload.ok, true);
});

test("document ingestion lifecycle supports retry and completion", async () => {
  const dependencies = createDependencies();
  const workspaceId = await createWorkspaceForActor(dependencies, "owner_3", "Ingestion");

  const createResult = await handleRequest(
    {
      method: "POST",
      url: "/documents/create",
      headers: defaultHeaders({
        "x-actor-id": "owner_3",
        "x-workspace-id": workspaceId,
      }),
      body: JSON.stringify({
        name: "Research",
        source: "research.pdf",
      }),
    },
    dependencies,
  );

  assert.equal(createResult.statusCode, 201);
  assert.equal(createResult.payload.ok, true);

  if (!createResult.payload.ok) {
    throw new Error("Expected document creation success");
  }

  const documentId = (createResult.payload.data as { document: { documentId: string } })
    .document.documentId;

  const processingResult = await handleRequest(
    {
      method: "POST",
      url: "/documents/processing",
      headers: defaultHeaders({
        "x-actor-id": "owner_3",
        "x-workspace-id": workspaceId,
      }),
      body: JSON.stringify({
        documentId,
      }),
    },
    dependencies,
  );

  assert.equal(processingResult.statusCode, 200);
  assert.equal(processingResult.payload.ok, true);

  const failResult = await handleRequest(
    {
      method: "POST",
      url: "/documents/fail",
      headers: defaultHeaders({
        "x-actor-id": "owner_3",
        "x-workspace-id": workspaceId,
      }),
      body: JSON.stringify({
        documentId,
        errorMessage: "parser_error",
      }),
    },
    dependencies,
  );

  assert.equal(failResult.statusCode, 200);
  assert.equal(failResult.payload.ok, true);

  const retryResult = await handleRequest(
    {
      method: "POST",
      url: "/documents/retry",
      headers: defaultHeaders({
        "x-actor-id": "owner_3",
        "x-workspace-id": workspaceId,
      }),
      body: JSON.stringify({
        documentId,
      }),
    },
    dependencies,
  );

  assert.equal(retryResult.statusCode, 200);
  assert.equal(retryResult.payload.ok, true);

  const processingRetry = await handleRequest(
    {
      method: "POST",
      url: "/documents/processing",
      headers: defaultHeaders({
        "x-actor-id": "owner_3",
        "x-workspace-id": workspaceId,
      }),
      body: JSON.stringify({
        documentId,
      }),
    },
    dependencies,
  );

  assert.equal(processingRetry.statusCode, 200);
  assert.equal(processingRetry.payload.ok, true);

  const completeResult = await handleRequest(
    {
      method: "POST",
      url: "/documents/complete",
      headers: defaultHeaders({
        "x-actor-id": "owner_3",
        "x-workspace-id": workspaceId,
      }),
      body: JSON.stringify({
        documentId,
        chunkCount: 8,
      }),
    },
    dependencies,
  );

  assert.equal(completeResult.statusCode, 200);
  assert.equal(completeResult.payload.ok, true);
});

test("document ingestion moves to dead letter after max retries", async () => {
  const dependencies = createDependencies();
  const workspaceId = await createWorkspaceForActor(dependencies, "owner_4", "Dead Letter");

  const createResult = await handleRequest(
    {
      method: "POST",
      url: "/documents/create",
      headers: defaultHeaders({
        "x-actor-id": "owner_4",
        "x-workspace-id": workspaceId,
      }),
      body: JSON.stringify({
        name: "Incident",
        source: "incident.pdf",
      }),
    },
    dependencies,
  );

  if (!createResult.payload.ok) {
    throw new Error("Expected document creation success");
  }

  const documentId = (createResult.payload.data as { document: { documentId: string } })
    .document.documentId;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const processingResult = await handleRequest(
      {
        method: "POST",
        url: "/documents/processing",
        headers: defaultHeaders({
          "x-actor-id": "owner_4",
          "x-workspace-id": workspaceId,
        }),
        body: JSON.stringify({ documentId }),
      },
      dependencies,
    );

    assert.equal(processingResult.statusCode, 200);
    assert.equal(processingResult.payload.ok, true);

    const failResult = await handleRequest(
      {
        method: "POST",
        url: "/documents/fail",
        headers: defaultHeaders({
          "x-actor-id": "owner_4",
          "x-workspace-id": workspaceId,
        }),
        body: JSON.stringify({
          documentId,
          errorMessage: "parser_error",
        }),
      },
      dependencies,
    );

    assert.equal(failResult.statusCode, 200);
    assert.equal(failResult.payload.ok, true);

    if (attempt < 3) {
      const retryResult = await handleRequest(
        {
          method: "POST",
          url: "/documents/retry",
          headers: defaultHeaders({
            "x-actor-id": "owner_4",
            "x-workspace-id": workspaceId,
          }),
          body: JSON.stringify({ documentId }),
        },
        dependencies,
      );

      assert.equal(retryResult.statusCode, 200);
      assert.equal(retryResult.payload.ok, true);
    }
  }

  const activityResult = await handleRequest(
    {
      method: "GET",
      url: `/documents/activity?documentId=${documentId}`,
      headers: defaultHeaders({
        "x-actor-id": "owner_4",
        "x-workspace-id": workspaceId,
      }),
      body: "",
    },
    dependencies,
  );

  assert.equal(activityResult.statusCode, 200);
  assert.equal(activityResult.payload.ok, true);
});

test("ai execute enforces role checks", async () => {
  const dependencies = createDependencies();
  const workspaceId = await createWorkspaceForActor(dependencies, "owner_1", "AI Workspace");

  const deniedResult = await handleRequest(
    {
      method: "POST",
      url: "/ai/execute",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "viewer_1",
      }),
      body: JSON.stringify({
        toolName: "echo",
        toolInput: { value: "blocked" },
      }),
    },
    dependencies,
  );

  assert.equal(deniedResult.statusCode, 403);
  assert.equal(deniedResult.payload.ok, false);
});

test("ai runtime endpoints expose run and tool call records", async () => {
  const dependencies = createDependencies();
  const workspaceId = await createWorkspaceForActor(dependencies, "owner_1", "AI Workspace");

  const executeResult = await handleRequest(
    {
      method: "POST",
      url: "/ai/execute",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        toolName: "echo",
        toolInput: { value: "hello" },
        threadId: "thread_test_1",
      }),
    },
    dependencies,
  );

  assert.equal(executeResult.statusCode, 200);
  assert.equal(executeResult.payload.ok, true);

  const runsResult = await handleRequest(
    {
      method: "GET",
      url: `/ai/runs?workspaceId=${workspaceId}`,
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: "",
    },
    dependencies,
  );

  assert.equal(runsResult.statusCode, 200);
  assert.equal(runsResult.payload.ok, true);

  if (!runsResult.payload.ok) {
    throw new Error("Expected ai/runs success");
  }

  const runs = runsResult.payload.data as {
    runs: Array<{
      runId: string;
      threadId?: string;
    }>;
  };
  assert.equal(runs.runs.length, 1);
  assert.equal(runs.runs[0]?.threadId, "thread_test_1");

  const toolCallsResult = await handleRequest(
    {
      method: "GET",
      url: `/ai/tool-calls?runId=${runs.runs[0]!.runId}`,
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: "",
    },
    dependencies,
  );

  assert.equal(toolCallsResult.statusCode, 200);
  assert.equal(toolCallsResult.payload.ok, true);
});

test("ai execute enforces explicit confirmation for high-risk tools", async () => {
  const dependencies = createDependencies();
  const workspaceId = await createWorkspaceForActor(dependencies, "owner_1", "AI Workspace");

  const deniedResult = await handleRequest(
    {
      method: "POST",
      url: "/ai/execute",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        toolName: "billing.cancel",
        toolInput: { workspaceId },
      }),
    },
    dependencies,
  );

  assert.equal(deniedResult.statusCode, 403);
  assert.equal(deniedResult.payload.ok, false);

  const confirmedResult = await handleRequest(
    {
      method: "POST",
      url: "/ai/execute",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        toolName: "billing.cancel",
        toolInput: { workspaceId },
        confirmHighRiskAction: true,
      }),
    },
    dependencies,
  );

  assert.equal(confirmedResult.statusCode, 200);
  assert.equal(confirmedResult.payload.ok, true);
});

test("ai execute blocks moderation-denied payloads with policy details", async () => {
  const dependencies = createDependencies();
  const workspaceId = await createWorkspaceForActor(dependencies, "owner_1", "AI Workspace");

  const blockedResult = await handleRequest(
    {
      method: "POST",
      url: "/ai/execute",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        toolName: "echo",
        toolInput: {
          text: "please DROP TABLE project_data",
        },
      }),
    },
    dependencies,
  );

  assert.equal(blockedResult.statusCode, 403);
  assert.equal(blockedResult.payload.ok, false);
  assert.equal(blockedResult.payload.code, "policy_denied");
  assert.equal(blockedResult.payload.details?.moderationRequired, true);
  assert.equal(blockedResult.payload.details?.moderationOutcome, "blocked");
});

test("retrieval routes index, query, and cite with tenant isolation", async () => {
  const dependencies = createDependencies();
  const ws1 = await createWorkspaceForActor(dependencies, "owner_1", "Retrieval A");
  const ws2 = await createWorkspaceForActor(dependencies, "owner_2", "Retrieval B");

  const indexResult = await handleRequest(
    {
      method: "POST",
      url: "/retrieval/index-chunks",
      headers: defaultHeaders({
        "x-workspace-id": ws1,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        documentId: "doc_1",
        sourceUri: "https://docs.example.com/faq",
        sourceTitle: "FAQ",
        embeddingModelVersion: "embed-v1",
        chunks: [
          {
            chunkId: "chk_1",
            text: "Upgrades are available from the billing page.",
            chunkStartOffset: 0,
            chunkEndOffset: 44,
          },
        ],
      }),
    },
    dependencies,
  );

  assert.equal(indexResult.statusCode, 201);
  assert.equal(indexResult.payload.ok, true);

  const queryResult = await handleRequest(
    {
      method: "POST",
      url: "/retrieval/query",
      headers: defaultHeaders({
        "x-workspace-id": ws1,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        query: "billing upgrades",
        method: "hybrid",
      }),
    },
    dependencies,
  );

  assert.equal(queryResult.statusCode, 200);
  assert.equal(queryResult.payload.ok, true);

  if (!queryResult.payload.ok) {
    throw new Error("Expected retrieval/query success");
  }

  const results = queryResult.payload.data as { results: Array<{ chunkId: string }> };
  assert.equal(results.results.length, 1);
  assert.equal(results.results[0]?.chunkId, "chk_1");

  const foreignQueryResult = await handleRequest(
    {
      method: "POST",
      url: "/retrieval/query",
      headers: defaultHeaders({
        "x-workspace-id": ws2,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        query: "billing upgrades",
        method: "hybrid",
      }),
    },
    dependencies,
  );

  assert.equal(foreignQueryResult.statusCode, 403);
  assert.equal(foreignQueryResult.payload.ok, false);

  const citationResult = await handleRequest(
    {
      method: "POST",
      url: "/retrieval/citations",
      headers: defaultHeaders({
        "x-workspace-id": ws1,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        agentRunId: "run_1",
        responseSegmentId: "seg_1",
        documentId: "doc_1",
        chunkId: "chk_1",
        evidenceType: "direct",
        confidenceScore: 0.91,
      }),
    },
    dependencies,
  );

  assert.equal(citationResult.statusCode, 201);
  assert.equal(citationResult.payload.ok, true);

  const listCitationsResult = await handleRequest(
    {
      method: "GET",
      url: "/retrieval/citations?agentRunId=run_1",
      headers: defaultHeaders({
        "x-workspace-id": ws1,
        "x-actor-id": "owner_1",
      }),
      body: "",
    },
    dependencies,
  );

  assert.equal(listCitationsResult.statusCode, 200);
  assert.equal(listCitationsResult.payload.ok, true);
});

test("integration and automation routes persist connector lifecycle and run history", async () => {
  const dependencies = createDependencies();
  const workspaceId = await createWorkspaceForActor(dependencies, "owner_1", "Automation WS");

  const registerConnectorResult = await handleRequest(
    {
      method: "POST",
      url: "/integrations/connectors/register",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        provider: "slack",
        authType: "oauth",
        credentialReference: "vault://connectors/slack/1",
      }),
    },
    dependencies,
  );
  assert.equal(registerConnectorResult.statusCode, 201);
  assert.equal(registerConnectorResult.payload.ok, true);
  if (!registerConnectorResult.payload.ok) {
    throw new Error("Expected connector registration success");
  }

  const connectorId = (
    registerConnectorResult.payload.data as {
      connector: {
        connectorId: string;
      };
    }
  ).connector.connectorId;

  const healthResult = await handleRequest(
    {
      method: "POST",
      url: "/integrations/connectors/health",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        connectorId,
        healthStatus: "degraded",
        errorMessage: "timeout",
      }),
    },
    dependencies,
  );
  assert.equal(healthResult.statusCode, 200);
  assert.equal(healthResult.payload.ok, true);

  const listConnectorsResult = await handleRequest(
    {
      method: "GET",
      url: `/integrations/connectors?workspaceId=${workspaceId}`,
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: "",
    },
    dependencies,
  );
  assert.equal(listConnectorsResult.statusCode, 200);
  assert.equal(listConnectorsResult.payload.ok, true);

  const createRuleResult = await handleRequest(
    {
      method: "POST",
      url: "/automation/rules/create",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        eventType: "invoice.created",
        actionName: "noop",
        maxRetries: 2,
      }),
    },
    dependencies,
  );
  assert.equal(createRuleResult.statusCode, 201);
  assert.equal(createRuleResult.payload.ok, true);

  const publishResult = await handleRequest(
    {
      method: "POST",
      url: "/automation/events/publish",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        eventType: "invoice.created",
        sourceSystem: "stripe",
        sourceEventId: "evt_ext_1",
        payload: { invoiceId: "in_1" },
      }),
    },
    dependencies,
  );
  assert.equal(publishResult.statusCode, 202);
  assert.equal(publishResult.payload.ok, true);

  const duplicatePublishResult = await handleRequest(
    {
      method: "POST",
      url: "/automation/events/publish",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        eventType: "invoice.created",
        sourceSystem: "stripe",
        sourceEventId: "evt_ext_1",
        payload: { invoiceId: "in_1" },
      }),
    },
    dependencies,
  );
  assert.equal(duplicatePublishResult.statusCode, 202);
  assert.equal(duplicatePublishResult.payload.ok, true);

  if (!duplicatePublishResult.payload.ok) {
    throw new Error("Expected duplicate publish response body");
  }

  const duplicatePayload = duplicatePublishResult.payload.data as { accepted: boolean };
  assert.equal(duplicatePayload.accepted, false);

  const runsResult = await handleRequest(
    {
      method: "GET",
      url: `/automation/runs?workspaceId=${workspaceId}`,
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: "",
    },
    dependencies,
  );
  assert.equal(runsResult.statusCode, 200);
  assert.equal(runsResult.payload.ok, true);

  if (!runsResult.payload.ok) {
    throw new Error("Expected automation runs response");
  }

  const runs = runsResult.payload.data as { runs: Array<{ status: string }> };
  assert.equal(runs.runs.length, 1);
  assert.equal(runs.runs[0]?.status, "completed");

  const ingestionResult = await handleRequest(
    {
      method: "GET",
      url: `/automation/events/ingestion?workspaceId=${workspaceId}`,
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: "",
    },
    dependencies,
  );
  assert.equal(ingestionResult.statusCode, 200);
  assert.equal(ingestionResult.payload.ok, true);

  const revokeResult = await handleRequest(
    {
      method: "POST",
      url: "/integrations/connectors/revoke",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        connectorId,
      }),
    },
    dependencies,
  );
  assert.equal(revokeResult.statusCode, 200);
  assert.equal(revokeResult.payload.ok, true);
});

test("notification preference routes persist user settings and enforce access rules", async () => {
  const dependencies = createDependencies();
  const workspaceId = await createWorkspaceForActor(dependencies, "owner_1", "Notifications WS");

  const inviteResult = await handleRequest(
    {
      method: "POST",
      url: "/workspaces/invite",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        workspaceId,
        email: "member@example.com",
        role: "member",
      }),
    },
    dependencies,
  );
  assert.equal(inviteResult.statusCode, 200);
  assert.equal(inviteResult.payload.ok, true);
  if (!inviteResult.payload.ok) {
    throw new Error("Expected invite success");
  }

  const inviteToken = (
    inviteResult.payload.data as {
      inviteToken: string;
    }
  ).inviteToken;

  const acceptInviteResult = await handleRequest(
    {
      method: "POST",
      url: "/workspaces/accept-invite",
      headers: defaultHeaders(),
      body: JSON.stringify({
        inviteToken,
        userId: "member_1",
      }),
    },
    dependencies,
  );
  assert.equal(acceptInviteResult.statusCode, 200);

  const updateOwnerPreferences = await handleRequest(
    {
      method: "POST",
      url: "/notifications/preferences/update",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        email: false,
        inApp: true,
        webhook: true,
      }),
    },
    dependencies,
  );
  assert.equal(updateOwnerPreferences.statusCode, 200);
  assert.equal(updateOwnerPreferences.payload.ok, true);

  const getOwnerPreferences = await handleRequest(
    {
      method: "GET",
      url: `/notifications/preferences?workspaceId=${workspaceId}`,
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: "",
    },
    dependencies,
  );
  assert.equal(getOwnerPreferences.statusCode, 200);
  assert.equal(getOwnerPreferences.payload.ok, true);
  if (!getOwnerPreferences.payload.ok) {
    throw new Error("Expected owner preference fetch success");
  }

  const ownerPreference = getOwnerPreferences.payload.data as {
    preference: {
      channels: {
        email: boolean;
        inApp: boolean;
        webhook: boolean;
      };
    };
  };
  assert.equal(ownerPreference.preference.channels.email, false);
  assert.equal(ownerPreference.preference.channels.webhook, true);

  const listAsOwner = await handleRequest(
    {
      method: "GET",
      url: `/notifications/preferences/list?workspaceId=${workspaceId}`,
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: "",
    },
    dependencies,
  );
  assert.equal(listAsOwner.statusCode, 200);
  assert.equal(listAsOwner.payload.ok, true);

  const listAsMember = await handleRequest(
    {
      method: "GET",
      url: `/notifications/preferences/list?workspaceId=${workspaceId}`,
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "member_1",
      }),
      body: "",
    },
    dependencies,
  );
  assert.equal(listAsMember.statusCode, 403);
  assert.equal(listAsMember.payload.ok, false);

  const memberTargetOwner = await handleRequest(
    {
      method: "GET",
      url: `/notifications/preferences?workspaceId=${workspaceId}&userId=owner_1`,
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "member_1",
      }),
      body: "",
    },
    dependencies,
  );
  assert.equal(memberTargetOwner.statusCode, 403);
  assert.equal(memberTargetOwner.payload.ok, false);
});

test("outbound webhook routes support dead-letter and replay controls", async () => {
  const dependencies = createDependencies();
  const workspaceId = await createWorkspaceForActor(dependencies, "owner_1", "Webhook WS");

  const enqueueResult = await handleRequest(
    {
      method: "POST",
      url: "/webhooks/outbound/enqueue",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        targetUrl: "https://hooks.example.com/outbound",
        eventType: "invoice.created",
        eventId: "evt_webhook_1",
        payload: { invoiceId: "in_1" },
        maxAttempts: 2,
      }),
    },
    dependencies,
  );

  assert.equal(enqueueResult.statusCode, 201);
  assert.equal(enqueueResult.payload.ok, true);
  if (!enqueueResult.payload.ok) {
    throw new Error("Expected webhook enqueue success");
  }

  const deliveryId = (
    enqueueResult.payload.data as { delivery: { deliveryId: string } }
  ).delivery.deliveryId;

  const firstAttemptResult = await handleRequest(
    {
      method: "POST",
      url: "/webhooks/outbound/attempt",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        deliveryId,
        success: false,
        errorMessage: "timeout",
      }),
    },
    dependencies,
  );
  assert.equal(firstAttemptResult.statusCode, 200);

  const secondAttemptResult = await handleRequest(
    {
      method: "POST",
      url: "/webhooks/outbound/attempt",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        deliveryId,
        success: false,
        errorMessage: "still failing",
      }),
    },
    dependencies,
  );
  assert.equal(secondAttemptResult.statusCode, 200);
  assert.equal(secondAttemptResult.payload.ok, true);

  if (!secondAttemptResult.payload.ok) {
    throw new Error("Expected second webhook attempt success");
  }

  const deadLetterDelivery = secondAttemptResult.payload.data as {
    delivery: {
      status: string;
    };
  };
  assert.equal(deadLetterDelivery.delivery.status, "dead_letter");

  const replayResult = await handleRequest(
    {
      method: "POST",
      url: "/webhooks/outbound/replay",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        deliveryId,
      }),
    },
    dependencies,
  );
  assert.equal(replayResult.statusCode, 200);
  assert.equal(replayResult.payload.ok, true);

  const deliveredResult = await handleRequest(
    {
      method: "POST",
      url: "/webhooks/outbound/attempt",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        deliveryId,
        success: true,
      }),
    },
    dependencies,
  );
  assert.equal(deliveredResult.statusCode, 200);
  assert.equal(deliveredResult.payload.ok, true);

  const listResult = await handleRequest(
    {
      method: "GET",
      url: `/webhooks/outbound/list?workspaceId=${workspaceId}`,
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: "",
    },
    dependencies,
  );
  assert.equal(listResult.statusCode, 200);
  assert.equal(listResult.payload.ok, true);
});

test("billing reconcile + quota endpoint returns deterministic result", async () => {
  const dependencies = createDependencies();
  const workspaceId = await createWorkspaceForActor(dependencies, "owner_1", "Billing WS");

  const reconcileResult = await handleRequest(
    {
      method: "POST",
      url: "/billing/reconcile",
      headers: defaultHeaders({
        "x-actor-id": "owner_1",
        "x-workspace-id": workspaceId,
      }),
      body: JSON.stringify({
        sourceEventId: "evt_bill_1",
        workspaceId,
        type: "subscription.activated",
        planId: "free",
      }),
    },
    dependencies,
  );

  assert.equal(reconcileResult.statusCode, 200);

  const usageResult = await handleRequest(
    {
      method: "POST",
      url: "/billing/usage",
      headers: defaultHeaders({
        "x-actor-id": "owner_1",
        "x-workspace-id": workspaceId,
      }),
      body: JSON.stringify({
        workspaceId,
        metric: "monthly_ai_actions",
        amount: 1,
      }),
    },
    dependencies,
  );

  assert.equal(usageResult.statusCode, 200);
  assert.equal(usageResult.payload.ok, true);
});

test("billing analytics routes store events and expose integrity anomalies", async () => {
  const dependencies = createDependencies();
  const workspaceId = await createWorkspaceForActor(
    dependencies,
    "owner_1",
    "Analytics WS",
  );

  const reconcileResult = await handleRequest(
    {
      method: "POST",
      url: "/billing/reconcile",
      headers: defaultHeaders({
        "x-actor-id": "owner_1",
        "x-workspace-id": workspaceId,
      }),
      body: JSON.stringify({
        sourceEventId: "evt_bill_analytics_1",
        workspaceId,
        type: "subscription.activated",
        planId: "free",
      }),
    },
    dependencies,
  );
  assert.equal(reconcileResult.statusCode, 200);

  const eventResult = await handleRequest(
    {
      method: "POST",
      url: "/billing/analytics-events",
      headers: defaultHeaders({
        "x-actor-id": "owner_1",
        "x-workspace-id": workspaceId,
      }),
      body: JSON.stringify({
        workspaceId,
        eventName: "entitlement_check",
        eventVersion: "1.0.0",
        planId: "pro",
        entitlementSnapshot: {
          featureKey: "ai_actions",
          entitlementStatus: "grace",
          quotaKey: "monthly_ai_actions",
          consumedUnits: 4,
          limitUnits: 5,
          counterVersion: 9,
        },
        payloadValidationStatus: "valid",
        idempotencyKey: "analytics_evt_1",
      }),
    },
    dependencies,
  );

  assert.equal(eventResult.statusCode, 201);
  assert.equal(eventResult.payload.ok, true);

  const eventsResult = await handleRequest(
    {
      method: "GET",
      url: `/billing/analytics-events?workspaceId=${workspaceId}`,
      headers: defaultHeaders({
        "x-actor-id": "owner_1",
        "x-workspace-id": workspaceId,
      }),
      body: "",
    },
    dependencies,
  );
  assert.equal(eventsResult.statusCode, 200);
  assert.equal(eventsResult.payload.ok, true);

  if (!eventsResult.payload.ok) {
    throw new Error("Expected analytics events list success");
  }

  const events = eventsResult.payload.data as { events: Array<{ eventName: string }> };
  assert.equal(events.events.length, 1);
  assert.equal(events.events[0]?.eventName, "entitlement_check");

  const anomaliesResult = await handleRequest(
    {
      method: "GET",
      url: `/billing/integrity-anomalies?workspaceId=${workspaceId}`,
      headers: defaultHeaders({
        "x-actor-id": "owner_1",
        "x-workspace-id": workspaceId,
      }),
      body: "",
    },
    dependencies,
  );
  assert.equal(anomaliesResult.statusCode, 200);
  assert.equal(anomaliesResult.payload.ok, true);

  if (!anomaliesResult.payload.ok) {
    throw new Error("Expected integrity anomalies list success");
  }

  const anomalies = anomaliesResult.payload.data as {
    anomalies: Array<{ expectedPlanId: string; observedPlanId: string }>;
  };
  assert.equal(anomalies.anomalies.length, 1);
  assert.equal(anomalies.anomalies[0]?.expectedPlanId, "free");
  assert.equal(anomalies.anomalies[0]?.observedPlanId, "pro");
});

test("tenant isolation blocks non-members from listing projects/documents", async () => {
  const dependencies = createDependencies();
  const workspaceId = await createWorkspaceForActor(
    dependencies,
    "owner_1",
    "Isolation WS",
  );

  const createProjectResult = await handleRequest(
    {
      method: "POST",
      url: "/projects/create",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        name: "Hidden project",
      }),
    },
    dependencies,
  );
  assert.equal(createProjectResult.statusCode, 201);

  const createDocumentResult = await handleRequest(
    {
      method: "POST",
      url: "/documents/create",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        name: "Hidden document",
        source: "s3://bucket/hidden.pdf",
      }),
    },
    dependencies,
  );
  assert.equal(createDocumentResult.statusCode, 201);

  const listProjectsDenied = await handleRequest(
    {
      method: "GET",
      url: `/projects/list?workspaceId=${workspaceId}`,
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "intruder_1",
      }),
      body: "",
    },
    dependencies,
  );
  assert.equal(listProjectsDenied.statusCode, 403);
  assert.equal(listProjectsDenied.payload.ok, false);

  const listDocumentsDenied = await handleRequest(
    {
      method: "GET",
      url: `/documents/list?workspaceId=${workspaceId}`,
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "intruder_1",
      }),
      body: "",
    },
    dependencies,
  );
  assert.equal(listDocumentsDenied.statusCode, 403);
  assert.equal(listDocumentsDenied.payload.ok, false);
});

test("workspace member listing restricted to owner/admin", async () => {
  const dependencies = createDependencies();
  const workspaceId = await createWorkspaceForActor(dependencies, "owner_1", "Members WS");

  const inviteResult = await handleRequest(
    {
      method: "POST",
      url: "/workspaces/invite",
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "owner_1",
      }),
      body: JSON.stringify({
        workspaceId,
        email: "member@example.com",
        role: "member",
      }),
    },
    dependencies,
  );
  assert.equal(inviteResult.statusCode, 200);
  if (!inviteResult.payload.ok) {
    throw new Error("Expected invite success");
  }

  const inviteToken = (
    inviteResult.payload.data as {
      inviteToken: string;
    }
  ).inviteToken;

  const acceptInviteResult = await handleRequest(
    {
      method: "POST",
      url: "/workspaces/accept-invite",
      headers: defaultHeaders(),
      body: JSON.stringify({
        inviteToken,
        userId: "member_1",
      }),
    },
    dependencies,
  );
  assert.equal(acceptInviteResult.statusCode, 200);

  const memberListDenied = await handleRequest(
    {
      method: "GET",
      url: `/workspaces/members?workspaceId=${workspaceId}`,
      headers: defaultHeaders({
        "x-workspace-id": workspaceId,
        "x-actor-id": "member_1",
      }),
      body: "",
    },
    dependencies,
  );
  assert.equal(memberListDenied.statusCode, 403);
  assert.equal(memberListDenied.payload.ok, false);
});

test("release authz regression route stores run and dashboard reflects tenant gate readiness", async () => {
  const dependencies = createDependencies();

  const evidenceResult = await handleRequest(
    {
      method: "POST",
      url: "/release/evidence",
      headers: defaultHeaders(),
      body: JSON.stringify({
        gate: "tenant_isolation",
        testsPassed: true,
        observabilityVerified: true,
        rollbackVerified: true,
        docsUpdated: true,
      }),
    },
    dependencies,
  );

  assert.equal(evidenceResult.statusCode, 200);
  assert.equal(evidenceResult.payload.ok, true);

  const dashboardBeforeResult = await handleRequest(
    {
      method: "GET",
      url: "/release/dashboard?gate=tenant_isolation",
      headers: defaultHeaders(),
      body: "",
    },
    dependencies,
  );

  assert.equal(dashboardBeforeResult.statusCode, 200);
  assert.equal(dashboardBeforeResult.payload.ok, true);
  if (!dashboardBeforeResult.payload.ok) {
    throw new Error("Expected release dashboard success before authz regression");
  }

  const before = dashboardBeforeResult.payload.data as {
    dashboard: {
      ready: boolean;
      missing: string[];
    };
  };
  assert.equal(before.dashboard.ready, false);
  assert.equal(before.dashboard.missing.includes("authzRegressionRun"), true);

  const regressionResult = await handleRequest(
    {
      method: "POST",
      url: "/release/authz-regression",
      headers: defaultHeaders(),
      body: JSON.stringify({
        gate: "tenant_isolation",
        suiteId: "authz_ci_suite",
        passed: true,
        totalTests: 12,
        passedTests: 12,
        failedTests: 0,
        ciRunUrl: "https://ci.example.com/runs/123",
      }),
    },
    dependencies,
  );

  assert.equal(regressionResult.statusCode, 200);
  assert.equal(regressionResult.payload.ok, true);

  const dashboardAfterResult = await handleRequest(
    {
      method: "GET",
      url: "/release/dashboard?gate=tenant_isolation",
      headers: defaultHeaders(),
      body: "",
    },
    dependencies,
  );

  assert.equal(dashboardAfterResult.statusCode, 200);
  assert.equal(dashboardAfterResult.payload.ok, true);
  if (!dashboardAfterResult.payload.ok) {
    throw new Error("Expected release dashboard success after authz regression");
  }

  const after = dashboardAfterResult.payload.data as {
    dashboard: {
      ready: boolean;
      checks: {
        authzRegression: {
          present: boolean;
          passed: boolean;
        };
      };
    };
    latestAuthzRegression: {
      suiteId: string;
      totalTests: number;
    } | null;
  };

  assert.equal(after.dashboard.ready, true);
  assert.equal(after.dashboard.checks.authzRegression.present, true);
  assert.equal(after.dashboard.checks.authzRegression.passed, true);
  assert.equal(after.latestAuthzRegression?.suiteId, "authz_ci_suite");
  assert.equal(after.latestAuthzRegression?.totalTests, 12);
});

test("release authz regression route validates numeric consistency", async () => {
  const dependencies = createDependencies();

  const result = await handleRequest(
    {
      method: "POST",
      url: "/release/authz-regression",
      headers: defaultHeaders(),
      body: JSON.stringify({
        gate: "tenant_isolation",
        passed: false,
        totalTests: 5,
        passedTests: 3,
        failedTests: 3,
      }),
    },
    dependencies,
  );

  assert.equal(result.statusCode, 400);
  assert.equal(result.payload.ok, false);

  if (result.payload.ok) {
    throw new Error("Expected release authz-regression validation failure");
  }

  assert.equal(result.payload.code, "validation_denied");
});
