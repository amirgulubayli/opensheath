import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { config as loadEnv } from "dotenv";

const envCandidates = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "..", ".env"),
  resolve(process.cwd(), "..", "..", ".env"),
  resolve(process.cwd(), "..", "..", "..", ".env"),
];

for (const candidate of envCandidates) {
  if (existsSync(candidate)) {
    loadEnv({ path: candidate });
    break;
  }
}

import {
  apiError,
  type ApiErrorCode,
  type ApiResponse,
  type ConfidenceBand,
  type EvidenceType,
  type RetrievalMethod,
} from "@ethoxford/contracts";
import {
  DomainError,
  InMemoryAgentRuntimeService,
  InMemoryAutomationEngine,
  InMemoryAuthService,
  InMemoryBillingService,
  InMemoryConnectorService,
  InMemoryEventBus,
  InMemoryIngestionService,
  InMemoryNotificationPreferenceService,
  InMemoryWebhookDeliveryService,
  InMemoryToolRegistry,
  InMemoryWorkspaceService,
  InMemoryProjectService,
  InMemoryRetrievalService,
  ReleaseReadinessService,
  isConfidenceBand,
  isEvidenceType,
} from "@ethoxford/domain";

import { handleRequest, type AppDependencies } from "./app.js";
import { createApiPool } from "./db.js";
import {
  DEFAULT_AI_ALERT_THRESHOLDS,
  evaluateAiRuntimeAlerts,
  summarizeAiRuntimeMetrics,
} from "./ai-observability.js";
import {
  DEFAULT_AUTH_ALERT_THRESHOLDS,
  evaluateAuthAlerts,
} from "./alerts.js";
import { loadRuntimeConfig, type RuntimeConfig } from "./env.js";
import { InMemoryRequestMetrics, StructuredLogger } from "./observability.js";
import { OpenAiResponsesGateway } from "./openai-gateway.js";
import {
  DEFAULT_TENANT_ALERT_THRESHOLDS,
  evaluateTenantIsolationAlerts,
  InMemoryTenantIsolationMetrics,
} from "./tenant-observability.js";
import {
  PostgresIngestionService,
  PostgresAutomationEngine,
  PostgresConnectorService,
  PostgresEventBus,
  PostgresAgentRuntimeService,
  PostgresBillingService,
  PostgresNotificationPreferenceService,
  PostgresProjectService,
  PostgresRetrievalService,
  PostgresWebhookDeliveryService,
  PostgresWorkspaceService,
} from "./persistence-services.js";
import {
  handleOpenClawRequest,
  type OpenClawDependencies,
} from "./openclaw-routes.js";
import { HttpToolsInvokeClient } from "./openclaw-client.js";
import {
  OpenClawOrchestrator,
  OpenAiOrchestratorLlm,
} from "./openclaw-orchestrator.js";
import OpenAI from "openai";
import {
  OpenClawGatewayRegistry,
  OpenClawWorkspaceBindingService,
  OpenClawToolCatalog,
  OpenClawPolicyCompiler,
  OpenClawKillSwitch,
  OpenClawAuditTrail,
  OpenClawInvocationStore,
  OpenClawSwarmOrchestrator,
  OpenClawMiddlewareChain,
} from "@ethoxford/domain";

interface RequestErrorPayload {
  code: ApiErrorCode;
  message: string;
}

export interface ApiServerOptions {
  runtime?: RuntimeConfig;
  dependencies?: AppDependencies;
  openClawDeps?: OpenClawDependencies;
  logger?: StructuredLogger;
  requestMetrics?: InMemoryRequestMetrics;
  tenantMetrics?: InMemoryTenantIsolationMetrics;
}

function isBillingRoute(path: string): boolean {
  return path === "/billing" || path.startsWith("/billing/");
}

function applySecurityHeaders(res: import("node:http").ServerResponse): void {
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("x-frame-options", "DENY");
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("permissions-policy", "geolocation=(), microphone=(), camera=()");
}

function isAllowedOrigin(origin: string): boolean {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function applyCorsHeaders(
  res: import("node:http").ServerResponse,
  origin: string | undefined,
): void {
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "origin");
  }

  res.setHeader(
    "access-control-allow-methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.setHeader(
    "access-control-allow-headers",
    "content-type,x-session-id,x-workspace-id,x-actor-id,x-actor-role,x-request-id,x-correlation-id",
  );
  res.setHeader("access-control-max-age", "600");
}

function createDefaultDependencies(options?: {
  enableBillingTools?: boolean;
  enableAiFeatures?: boolean;
  databaseUrl?: string;
  openAiApiKey?: string;
  openAiModel?: string;
}): AppDependencies {
  const enableBillingTools = options?.enableBillingTools ?? true;
  const pool = options?.databaseUrl ? createApiPool(options.databaseUrl) : undefined;
  const llmGateway =
    options?.enableAiFeatures && options?.openAiApiKey
      ? new OpenAiResponsesGateway({
          apiKey: options.openAiApiKey,
          ...(options.openAiModel ? { model: options.openAiModel } : {}),
        })
      : undefined;
  const authService = new InMemoryAuthService();
  const workspaceService = pool
    ? new PostgresWorkspaceService(pool)
    : new InMemoryWorkspaceService();
  const projectService = pool
    ? new PostgresProjectService(pool)
    : new InMemoryProjectService();
  const ingestionService = pool
    ? new PostgresIngestionService(pool)
    : new InMemoryIngestionService();
  const retrievalService = pool
    ? new PostgresRetrievalService(pool)
    : new InMemoryRetrievalService();
  const eventBus = pool ? new PostgresEventBus(pool) : new InMemoryEventBus();
  const automationEngine = pool
    ? new PostgresAutomationEngine(pool)
    : new InMemoryAutomationEngine();
  const connectorService = pool
    ? new PostgresConnectorService(pool)
    : new InMemoryConnectorService();
  const notificationPreferenceService = pool
    ? new PostgresNotificationPreferenceService(pool)
    : new InMemoryNotificationPreferenceService();
  const webhookDeliveryService = pool
    ? new PostgresWebhookDeliveryService(pool)
    : new InMemoryWebhookDeliveryService();
  const toolRegistry = new InMemoryToolRegistry();
  const agentRuntimeService = pool
    ? new PostgresAgentRuntimeService(pool, toolRegistry, llmGateway)
    : new InMemoryAgentRuntimeService(toolRegistry, undefined, undefined, llmGateway);
  const billingService = pool
    ? new PostgresBillingService(pool)
    : new InMemoryBillingService();
  const releaseReadinessService = new ReleaseReadinessService();

  billingService.setEntitlementPolicy({
    planId: "free",
    features: {
      ai_actions: true,
    },
    quotas: {
      monthly_ai_actions: 100,
    },
  });

  toolRegistry.register({
    name: "echo",
    version: "v1",
    riskClass: "low",
    requiredRoles: ["member", "admin", "owner"],
    handler: async (input) => ({
      echoed: input,
    }),
  });

  toolRegistry.register({
    name: "project.list",
    version: "v1",
    riskClass: "low",
    requiredRoles: ["viewer", "member", "admin", "owner"],
    handler: async (_input, context) => ({
      projects: context.workspaceId
        ? projectService.listByWorkspace(context.workspaceId)
      : [],
    }),
  });

  toolRegistry.register({
    name: "project.create",
    version: "v1",
    riskClass: "low",
    requiredRoles: ["member", "admin", "owner"],
    handler: async (input, context) => {
      const body = requireToolObjectInput(input);
      const name = requireToolStringField(body, "name");
      const description = optionalToolStringField(body, "description");

      const project = projectService.createProject(context, {
        name,
        ...(description !== undefined ? { description } : {}),
      });

      return { project };
    },
  });

  toolRegistry.register({
    name: "project.transition",
    version: "v1",
    riskClass: "medium",
    requiredRoles: ["member", "admin", "owner"],
    handler: async (input, context) => {
      const body = requireToolObjectInput(input);
      const projectId = requireToolStringField(body, "projectId");
      const nextStatus = parseProjectStatus(requireToolStringField(body, "nextStatus"));
      const project = projectService.transitionStatus(context, projectId, nextStatus);

      return { project };
    },
  });

  toolRegistry.register({
    name: "project.update",
    version: "v1",
    riskClass: "medium",
    requiredRoles: ["member", "admin", "owner"],
    handler: async (input, context) => {
      const body = requireToolObjectInput(input);
      const projectId = requireToolStringField(body, "projectId");
      const name = optionalToolStringField(body, "name");
      const description = optionalToolStringField(body, "description");

      if (name === undefined && description === undefined) {
        throw new DomainError("validation_denied", "name or description is required", {
          field: "name,description",
        });
      }

      const project = projectService.updateProject(context, projectId, {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
      });

      return { project };
    },
  });

  toolRegistry.register({
    name: "project.activity",
    version: "v1",
    riskClass: "low",
    requiredRoles: ["viewer", "member", "admin", "owner"],
    handler: async (input, context) => {
      const body = requireToolObjectInput(input);
      const projectId = requireToolStringField(body, "projectId");
      const events = projectService.getActivity(context, projectId);

      return { events };
    },
  });

  toolRegistry.register({
    name: "document.create",
    version: "v1",
    riskClass: "low",
    requiredRoles: ["member", "admin", "owner"],
    handler: async (input, context) => {
      const body = requireToolObjectInput(input);
      const name = requireToolStringField(body, "name");
      const source = requireToolStringField(body, "source");
      const document = ingestionService.createDocument(context, {
        name,
        source,
      });

      return { document };
    },
  });

  toolRegistry.register({
    name: "document.list",
    version: "v1",
    riskClass: "low",
    requiredRoles: ["viewer", "member", "admin", "owner"],
    handler: async (_input, context) => ({
      documents: context.workspaceId
        ? ingestionService.listByWorkspace(context.workspaceId)
        : [],
    }),
  });

  toolRegistry.register({
    name: "document.activity",
    version: "v1",
    riskClass: "low",
    requiredRoles: ["viewer", "member", "admin", "owner"],
    handler: async (input, context) => {
      const body = requireToolObjectInput(input);
      const documentId = requireToolStringField(body, "documentId");
      const events = ingestionService.getActivity(context, documentId);

      return { events };
    },
  });

  toolRegistry.register({
    name: "document.processing",
    version: "v1",
    riskClass: "low",
    requiredRoles: ["member", "admin", "owner"],
    handler: async (input, context) => {
      const body = requireToolObjectInput(input);
      const documentId = requireToolStringField(body, "documentId");
      const document = ingestionService.markProcessing(context, documentId);

      return { document };
    },
  });

  toolRegistry.register({
    name: "document.fail",
    version: "v1",
    riskClass: "medium",
    requiredRoles: ["member", "admin", "owner"],
    handler: async (input, context) => {
      const body = requireToolObjectInput(input);
      const documentId = requireToolStringField(body, "documentId");
      const errorMessage = requireToolStringField(body, "errorMessage");
      const document = ingestionService.markFailed(context, documentId, errorMessage);

      return { document };
    },
  });

  toolRegistry.register({
    name: "document.retry",
    version: "v1",
    riskClass: "low",
    requiredRoles: ["member", "admin", "owner"],
    handler: async (input, context) => {
      const body = requireToolObjectInput(input);
      const documentId = requireToolStringField(body, "documentId");
      const replayDeadLetter =
        typeof body.replayDeadLetter === "boolean" ? body.replayDeadLetter : undefined;
      const document = ingestionService.retry(context, documentId, {
        ...(replayDeadLetter !== undefined ? { replayDeadLetter } : {}),
      });

      return { document };
    },
  });

  toolRegistry.register({
    name: "document.complete",
    version: "v1",
    riskClass: "low",
    requiredRoles: ["member", "admin", "owner"],
    handler: async (input, context) => {
      const body = requireToolObjectInput(input);
      const documentId = requireToolStringField(body, "documentId");
      const chunkCount = requireToolIntegerField(body, "chunkCount");
      const document = ingestionService.markCompleted(context, documentId, chunkCount);

      return { document };
    },
  });

  toolRegistry.register({
    name: "retrieval.index-chunks",
    version: "v1",
    riskClass: "medium",
    requiredRoles: ["member", "admin", "owner"],
    handler: async (input, context) => {
      const body = requireToolObjectInput(input);
      const documentId = requireToolStringField(body, "documentId");
      const sourceUri = requireToolStringField(body, "sourceUri");
      const sourceTitle = requireToolStringField(body, "sourceTitle");
      const embeddingModelVersion = requireToolStringField(body, "embeddingModelVersion");
      const chunksPayload = body.chunks;

      if (!Array.isArray(chunksPayload)) {
        throw new DomainError("validation_denied", "chunks must be an array", {
          field: "chunks",
        });
      }

      const chunks = chunksPayload.map((chunk, index) => {
        if (!chunk || typeof chunk !== "object") {
          throw new DomainError("validation_denied", "chunk must be an object", {
            field: `chunks[${index}]`,
          });
        }

        const chunkBody = chunk as Record<string, unknown>;
        const text = requireToolStringField(chunkBody, "text");
        const chunkStartOffset = parseToolNumberField(
          chunkBody.chunkStartOffset,
          "chunkStartOffset",
        );
        const chunkEndOffset = parseToolNumberField(
          chunkBody.chunkEndOffset,
          "chunkEndOffset",
        );

        if (!Number.isInteger(chunkStartOffset) || !Number.isInteger(chunkEndOffset)) {
          throw new DomainError("validation_denied", "chunk offsets must be integers", {
            field: `chunks[${index}].chunkStartOffset,chunkEndOffset`,
          });
        }

        const indexedAt =
          typeof chunkBody.indexedAt === "string" ? chunkBody.indexedAt : undefined;
        const chunkId = typeof chunkBody.chunkId === "string" ? chunkBody.chunkId : undefined;

        const chunkInput: {
          text: string;
          chunkStartOffset: number;
          chunkEndOffset: number;
          indexedAt?: string;
          chunkId?: string;
        } = {
          text,
          chunkStartOffset,
          chunkEndOffset,
          ...(indexedAt ? { indexedAt } : {}),
          ...(chunkId ? { chunkId } : {}),
        };

        return chunkInput;
      });

      const indexed = retrievalService.indexChunks(context, {
        documentId,
        sourceUri,
        sourceTitle,
        embeddingModelVersion,
        chunks,
      });

      return { indexed };
    },
  });

  toolRegistry.register({
    name: "retrieval.query",
    version: "v1",
    riskClass: "low",
    requiredRoles: ["viewer", "member", "admin", "owner"],
    handler: async (input, context) => {
      const body = requireToolObjectInput(input);
      const query = requireToolStringField(body, "query");
      const method =
        typeof body.method === "string" ? parseRetrievalMethod(body.method) : undefined;
      const limit =
        body.limit === undefined
          ? undefined
          : parseToolNumberField(body.limit, "limit");
      const minScore =
        body.minScore === undefined
          ? undefined
          : parseToolNumberField(body.minScore, "minScore");

      const results = retrievalService.query(context, {
        query,
        ...(method ? { method } : {}),
        ...(limit !== undefined ? { limit } : {}),
        ...(minScore !== undefined ? { minScore } : {}),
      });

      return { results };
    },
  });

  toolRegistry.register({
    name: "retrieval.citations.record",
    version: "v1",
    riskClass: "medium",
    requiredRoles: ["member", "admin", "owner"],
    handler: async (input, context) => {
      const body = requireToolObjectInput(input);
      const agentRunId = requireToolStringField(body, "agentRunId");
      const responseSegmentId = requireToolStringField(body, "responseSegmentId");
      const documentId = requireToolStringField(body, "documentId");
      const chunkId = requireToolStringField(body, "chunkId");
      const evidenceType = parseEvidenceTypeValue(
        requireToolStringField(body, "evidenceType"),
      );
      const confidenceScore = parseToolNumberField(body.confidenceScore, "confidenceScore");
      const citationId = typeof body.citationId === "string" ? body.citationId : undefined;
      const confidenceBand =
        typeof body.confidenceBand === "string"
          ? parseConfidenceBandValue(body.confidenceBand)
          : undefined;

      const citation = retrievalService.recordCitation(context, {
        agentRunId,
        responseSegmentId,
        documentId,
        chunkId,
        evidenceType,
        confidenceScore,
        ...(citationId ? { citationId } : {}),
        ...(confidenceBand ? { confidenceBand } : {}),
      });

      return { citation };
    },
  });

  toolRegistry.register({
    name: "retrieval.citations.list",
    version: "v1",
    riskClass: "low",
    requiredRoles: ["viewer", "member", "admin", "owner"],
    handler: async (input, context) => {
      const body = requireToolObjectInput(input);
      const agentRunId =
        typeof body.agentRunId === "string" && body.agentRunId.trim()
          ? body.agentRunId
          : undefined;
      const citations = retrievalService.listCitations(context, agentRunId);

      return { citations };
    },
  });

  if (enableBillingTools) {
    toolRegistry.register({
      name: "billing.cancel",
      version: "v1",
      riskClass: "high",
      requiredRoles: ["owner"],
      handler: async () => ({
        canceled: true,
      }),
    });
  }

  automationEngine.registerAction("noop", async () => {
    // baseline action used for automation rule verification paths
  });

  automationEngine.registerAction("notify", async () => {
    // simulated notifier action for integration automation slices
  });

  return {
    authService,
    workspaceService,
    projectService,
    ingestionService,
    retrievalService,
    eventBus,
    automationEngine,
    connectorService,
    notificationPreferenceService,
    webhookDeliveryService,
    agentRuntimeService,
    billingService,
    releaseReadinessService,
  };
}

function createOpenClawDependencies(): OpenClawDependencies {
  const gatewayRegistry = new OpenClawGatewayRegistry();
  const bindingService = new OpenClawWorkspaceBindingService();
  const toolCatalog = new OpenClawToolCatalog();
  const policyCompiler = new OpenClawPolicyCompiler();
  const killSwitch = new OpenClawKillSwitch();
  const auditTrail = new OpenClawAuditTrail();
  const invocationStore = new OpenClawInvocationStore();
  const swarmOrchestrator = new OpenClawSwarmOrchestrator();
  const gatewayClient = new HttpToolsInvokeClient({ tls: false });

  const middlewareChain = new OpenClawMiddlewareChain(
    gatewayRegistry,
    bindingService,
    toolCatalog,
    policyCompiler,
    killSwitch,
    auditTrail,
    invocationStore,
    gatewayClient,
  );

  // ── Seed default OpenClaw gateway, binding & policy ────────────
  // Uses env vars if set, otherwise falls back to the VPS gateway.
  const seedHost = process.env.OPENCLAW_GATEWAY_HOST ?? "100.111.98.27";
  const seedPort = Number(process.env.OPENCLAW_GATEWAY_PORT ?? "18790");
  const seedToken = process.env.OPENCLAW_GATEWAY_TOKEN ?? "6926c794baef57e9afe248638f1b48a93cc74d3a9ce27796";
  const seedWs = process.env.OPENCLAW_DEFAULT_WORKSPACE ?? "ethoxford-ws";

  const defaultGw = gatewayRegistry.register({
    environment: "production",
    host: seedHost,
    port: seedPort,
    authMode: "token" as import("@ethoxford/contracts").OpenClawGatewayAuthMode,
    tokenRef: seedToken,
    basePath: "",
    loopbackOnly: false,
  });

  bindingService.bind({
    workspaceId: seedWs,
    gatewayId: defaultGw.gatewayId,
    defaultSessionKey: "main",
    agentIdPrefix: seedWs,
  });

  // Permissive allow-all policy for the default workspace so invocations
  // are not denied by the deny-by-default middleware policy.
  policyCompiler.addRule({
    workspaceId: seedWs,
    role: "*",
    toolName: "*",
    action: "*",
    decision: "allow" as import("@ethoxford/contracts").OpenClawPolicyDecision,
  });

  // Register a wildcard tool catalog entry with low risk so invocations
  // don't require approval by default.
  toolCatalog.register({
    toolName: "*",
    gatewayId: defaultGw.gatewayId,
    riskTier: 0 as import("@ethoxford/contracts").OpenClawToolRiskTier,
    approvalRequired: "none",
    allowedActions: ["*"],
    description: "Default wildcard – allows any tool through the gateway",
    allowedWorkspaces: ["*"],
    allowedRoles: ["owner", "admin", "member", "operator"],
  });

  console.log(
    `[openclaw] Seeded default gateway ${defaultGw.gatewayId} → ${seedHost}:${seedPort}, ` +
    `bound to workspace "${seedWs}" with allow-all policy`,
  );
  // ── End seed ───────────────────────────────────────────────────

  // ── Orchestrator with LLM-powered decomposition & synthesis ────
  const openAiKey = process.env.OPENAI_API_KEY;
  const openAiModel = process.env.OPENAI_MODEL?.trim();
  let orchestratorLlm: import("./openclaw-orchestrator.js").OrchestratorLlm | undefined;
  if (openAiKey) {
    try {
      const client = new OpenAI({ apiKey: openAiKey });
      orchestratorLlm = new OpenAiOrchestratorLlm(client, openAiModel);
      console.log(`[openclaw] Orchestrator LLM enabled (model=${openAiModel ?? "gpt-4.1-mini"})`);
    } catch (err) {
      console.warn(`[openclaw] Failed to init orchestrator LLM:`, err);
    }
  } else {
    console.log(`[openclaw] Orchestrator LLM disabled (no OPENAI_API_KEY)`);
  }

  const orchestrator = new OpenClawOrchestrator(
    {
      maxConcurrency: 5,
      maxRetries: 2,
      retryBaseDelayMs: 1000,
      totalTimeoutMs: 120_000,
      subtaskTimeoutMs: 60_000,
      useLlmDecomposition: !!orchestratorLlm,
      useLlmSynthesis: !!orchestratorLlm,
    },
    orchestratorLlm ?? null,
  );
  // ── End orchestrator ───────────────────────────────────────────

  return {
    gatewayRegistry,
    bindingService,
    toolCatalog,
    policyCompiler,
    killSwitch,
    auditTrail,
    invocationStore,
    swarmOrchestrator,
    middlewareChain,
    orchestrator,
    orchestratorLlm,
  };
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function resolveRequestIds(
  headers: Record<string, string | string[] | undefined>,
): { requestId: string; correlationId: string } {
  const requestId = headerValue(headers["x-request-id"]) ?? `req_${randomUUID()}`;
  const correlationId =
    headerValue(headers["x-correlation-id"]) ?? `corr_${randomUUID()}`;

  return {
    requestId,
    correlationId,
  };
}

function resolveAuthMethod(
  headers: Record<string, string | string[] | undefined>,
  sessionId: string | undefined,
): string {
  return headerValue(headers["x-auth-method"]) ?? (sessionId ? "session" : "anonymous");
}

function durationMs(startedAt: bigint): number {
  return Number((Number(process.hrtime.bigint() - startedAt) / 1_000_000).toFixed(2));
}

function parseThreshold(value: string | null, fallback: number): number {
  if (value === null) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function requireToolObjectInput(
  value: unknown,
  fieldName = "toolInput",
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DomainError("validation_denied", `${fieldName} must be an object`, {
      field: fieldName,
    });
  }

  return value as Record<string, unknown>;
}

function requireToolStringField(
  object: Record<string, unknown>,
  fieldName: string,
): string {
  const value = object[fieldName];

  if (typeof value !== "string" || value.trim() === "") {
    throw new DomainError("validation_denied", `${fieldName} is required`, {
      field: fieldName,
    });
  }

  return value;
}

function optionalToolStringField(
  object: Record<string, unknown>,
  fieldName: string,
): string | undefined {
  const value = object[fieldName];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new DomainError("validation_denied", `${fieldName} must be a string`, {
      field: fieldName,
    });
  }

  return value;
}

function requireToolIntegerField(
  object: Record<string, unknown>,
  fieldName: string,
): number {
  const value = object[fieldName];
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new DomainError("validation_denied", `${fieldName} must be a non-negative integer`, {
      field: fieldName,
    });
  }

  return parsed;
}

function parseProjectStatus(
  value: string,
): "draft" | "active" | "archived" {
  if (value === "draft" || value === "active" || value === "archived") {
    return value;
  }

  throw new DomainError("validation_denied", "nextStatus is invalid", {
    field: "nextStatus",
  });
}

function parseToolNumberField(value: unknown, fieldName: string): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new DomainError("validation_denied", `${fieldName} must be a number`, {
      field: fieldName,
    });
  }

  return parsed;
}

function parseRetrievalMethod(value: string): RetrievalMethod {
  if (value === "semantic" || value === "keyword" || value === "hybrid") {
    return value;
  }

  throw new DomainError("validation_denied", "method is invalid", {
    field: "method",
  });
}

function parseEvidenceTypeValue(value: string): EvidenceType {
  if (isEvidenceType(value)) {
    return value;
  }

  throw new DomainError("validation_denied", "evidenceType is invalid", {
    field: "evidenceType",
  });
}

function parseConfidenceBandValue(value: string): ConfidenceBand {
  if (isConfidenceBand(value)) {
    return value;
  }

  throw new DomainError("validation_denied", "confidenceBand is invalid", {
    field: "confidenceBand",
  });
}

function mapDomainErrorToStatus(error: DomainError): number {
  switch (error.code) {
    case "validation_denied":
      return 400;
    case "auth_denied":
      return 401;
    case "policy_denied":
      return 403;
    case "not_found":
      return 404;
    case "conflict":
      return 409;
    case "rate_limited":
      return 429;
    case "unavailable":
      return 503;
    case "internal_error":
    default:
      return 500;
  }
}

async function resolveAiObservabilityWorkspace(
  headers: Record<string, string | string[] | undefined>,
  dependencies: AppDependencies,
  requestedWorkspaceId: string | undefined,
): Promise<{
  workspaceId: string;
  actorId: string;
}> {
  const sessionId = headerValue(headers["x-session-id"]);
  let actorId = headerValue(headers["x-actor-id"]);
  let workspaceId = requestedWorkspaceId ?? headerValue(headers["x-workspace-id"]);

  if (sessionId) {
    const session = await dependencies.authService.requireSession(sessionId);
    actorId = session.userId;

    if (workspaceId && workspaceId !== session.workspaceId) {
      throw new DomainError("policy_denied", "Session workspace mismatch", {
        sessionWorkspaceId: session.workspaceId,
        requestedWorkspaceId: workspaceId,
      });
    }

    workspaceId = workspaceId ?? session.workspaceId;
  }

  if (!workspaceId) {
    throw new DomainError("validation_denied", "workspaceId query param is required", {
      field: "workspaceId",
    });
  }

  if (!actorId) {
    throw new DomainError("auth_denied", "Missing actor in request context", {
      field: "actorId",
    });
  }

  const roles = await dependencies.workspaceService.getRolesForUser(actorId, workspaceId);
  if (roles.length === 0) {
    throw new DomainError("policy_denied", "Actor is not a workspace member", {
      workspaceId,
      actorId,
    });
  }

  return {
    workspaceId,
    actorId,
  };
}

function parseErrorPayload(payload: ApiResponse<unknown>): RequestErrorPayload | undefined {
  if (payload.ok) {
    return undefined;
  }

  return {
    code: payload.code,
    message: payload.message,
  };
}

function isDeniedError(
  errorCode: ApiErrorCode | undefined,
): errorCode is "auth_denied" | "policy_denied" {
  return errorCode === "auth_denied" || errorCode === "policy_denied";
}

function isExecutedDirectly(): boolean {
  const entrypoint = process.argv[1];

  if (!entrypoint) {
    return false;
  }

  return import.meta.url === pathToFileURL(resolve(entrypoint)).href;
}

export function createApiServer(options: ApiServerOptions = {}): Server {
  const runtime = options.runtime;
  const dependencies = options.dependencies ??
    createDefaultDependencies({
      enableBillingTools: runtime?.enableBilling ?? true,
      enableAiFeatures: runtime?.enableAiFeatures ?? false,
      ...(runtime?.databaseUrl ? { databaseUrl: runtime.databaseUrl } : {}),
      ...(runtime?.openAiApiKey ? { openAiApiKey: runtime.openAiApiKey } : {}),
      ...(runtime?.openAiModel ? { openAiModel: runtime.openAiModel } : {}),
    });
  const logger = options.logger ?? new StructuredLogger("api");
  const requestMetrics = options.requestMetrics ?? new InMemoryRequestMetrics("api");
  const tenantMetrics = options.tenantMetrics ?? new InMemoryTenantIsolationMetrics();
  const openClawDeps = options.openClawDeps ?? createOpenClawDependencies();

  return createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    const startedAt = process.hrtime.bigint();
    const method = req.method ?? "GET";
    const parsedUrl = new URL(req.url ?? "/", "http://localhost");
    const path = parsedUrl.pathname;
    const requestTimestamp = new Date().toISOString();
    const workspaceId = headerValue(req.headers["x-workspace-id"]);
    const actorId = headerValue(req.headers["x-actor-id"]);
    const sessionId = headerValue(req.headers["x-session-id"]);
    const origin = headerValue(req.headers.origin);
    const { requestId, correlationId } = resolveRequestIds(
      req.headers as Record<string, string | string[] | undefined>,
    );
    const authMethod = resolveAuthMethod(
      req.headers as Record<string, string | string[] | undefined>,
      sessionId,
    );

    const requestContext = {
      requestId,
      correlationId,
      method,
      path,
      requestTimestamp,
      authMethod,
      ...(workspaceId ? { workspaceId } : {}),
      ...(actorId ? { actorId } : {}),
      ...(sessionId ? { sessionId } : {}),
    };

    logger.log({
      event: "request.start",
      ...requestContext,
    });

    applyCorsHeaders(res, origin);

    if (method === "OPTIONS") {
      const preflightDuration = durationMs(startedAt);
      requestMetrics.record({
        method,
        path,
        statusCode: 204,
        durationMs: preflightDuration,
      });

      logger.log({
        event: "request.complete",
        ...requestContext,
        statusCode: 204,
        durationMs: preflightDuration,
      });

      res.statusCode = 204;
      applySecurityHeaders(res);
      res.setHeader("x-request-id", requestId);
      res.setHeader("x-correlation-id", correlationId);
      res.end();
      return;
    }

    if (method === "GET" && path === "/metrics") {
      const snapshot = requestMetrics.snapshot();
      const metricDuration = durationMs(startedAt);
      requestMetrics.record({
        method,
        path,
        statusCode: 200,
        durationMs: metricDuration,
      });

      logger.log({
        event: "request.complete",
        ...requestContext,
        statusCode: 200,
        durationMs: metricDuration,
      });

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.setHeader("x-request-id", requestId);
      res.setHeader("x-correlation-id", correlationId);
      res.end(JSON.stringify(snapshot));
      return;
    }

    if (method === "GET" && path === "/alerts/auth") {
      const snapshot = requestMetrics.snapshot();
      const thresholds = {
        minAuthRequestCount: parseThreshold(
          parsedUrl.searchParams.get("minAuthRequests"),
          DEFAULT_AUTH_ALERT_THRESHOLDS.minAuthRequestCount,
        ),
        p1AuthFailureRate: parseThreshold(
          parsedUrl.searchParams.get("p1FailureRate"),
          DEFAULT_AUTH_ALERT_THRESHOLDS.p1AuthFailureRate,
        ),
        p2UnauthorizedAttemptCount: parseThreshold(
          parsedUrl.searchParams.get("p2UnauthorizedAttempts"),
          DEFAULT_AUTH_ALERT_THRESHOLDS.p2UnauthorizedAttemptCount,
        ),
      };
      const evaluation = evaluateAuthAlerts(snapshot, thresholds);
      const alertDuration = durationMs(startedAt);
      requestMetrics.record({
        method,
        path,
        statusCode: 200,
        durationMs: alertDuration,
      });

      logger.log({
        event: "request.complete",
        ...requestContext,
        statusCode: 200,
        durationMs: alertDuration,
      });

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.setHeader("x-request-id", requestId);
      res.setHeader("x-correlation-id", correlationId);
      res.end(JSON.stringify(evaluation));
      return;
    }

    if (method === "GET" && path === "/metrics/tenant") {
      const snapshot = tenantMetrics.snapshot();
      const metricDuration = durationMs(startedAt);
      requestMetrics.record({
        method,
        path,
        statusCode: 200,
        durationMs: metricDuration,
      });

      logger.log({
        event: "request.complete",
        ...requestContext,
        statusCode: 200,
        durationMs: metricDuration,
      });

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.setHeader("x-request-id", requestId);
      res.setHeader("x-correlation-id", correlationId);
      res.end(JSON.stringify(snapshot));
      return;
    }

    if (method === "GET" && path === "/alerts/tenant") {
      const snapshot = tenantMetrics.snapshot();
      const thresholds = {
        minTenantRequestCount: parseThreshold(
          parsedUrl.searchParams.get("minTenantRequests"),
          DEFAULT_TENANT_ALERT_THRESHOLDS.minTenantRequestCount,
        ),
        p1CrossTenantDeniedCount: parseThreshold(
          parsedUrl.searchParams.get("p1CrossTenantDeniedCount"),
          DEFAULT_TENANT_ALERT_THRESHOLDS.p1CrossTenantDeniedCount,
        ),
        p2UnauthorizedTenantRate: parseThreshold(
          parsedUrl.searchParams.get("p2UnauthorizedTenantRate"),
          DEFAULT_TENANT_ALERT_THRESHOLDS.p2UnauthorizedTenantRate,
        ),
        p2WorkspaceLifecycleAnomalyRate: parseThreshold(
          parsedUrl.searchParams.get("p2WorkspaceLifecycleAnomalyRate"),
          DEFAULT_TENANT_ALERT_THRESHOLDS.p2WorkspaceLifecycleAnomalyRate,
        ),
        p2MembershipDeniedCount: parseThreshold(
          parsedUrl.searchParams.get("p2MembershipDeniedCount"),
          DEFAULT_TENANT_ALERT_THRESHOLDS.p2MembershipDeniedCount,
        ),
      };
      const evaluation = evaluateTenantIsolationAlerts(snapshot, thresholds);
      const alertDuration = durationMs(startedAt);
      requestMetrics.record({
        method,
        path,
        statusCode: 200,
        durationMs: alertDuration,
      });

      logger.log({
        event: "request.complete",
        ...requestContext,
        statusCode: 200,
        durationMs: alertDuration,
      });

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.setHeader("x-request-id", requestId);
      res.setHeader("x-correlation-id", correlationId);
      res.end(JSON.stringify(evaluation));
      return;
    }

    if (runtime && !runtime.enableBilling && isBillingRoute(path)) {
      const blockedDuration = durationMs(startedAt);
      const payload = apiError(correlationId, "not_found", "Route not found", {
        path,
      });

      requestMetrics.record({
        method,
        path,
        statusCode: 404,
        durationMs: blockedDuration,
        errorCode: "not_found",
      });
      tenantMetrics.record({
        method,
        path,
        statusCode: 404,
        errorCode: "not_found",
        errorMessage: "Billing feature disabled",
      });

      logger.log({
        event: "request.error",
        ...requestContext,
        statusCode: 404,
        durationMs: blockedDuration,
        errorCode: "not_found",
        errorMessage: "Billing feature disabled",
      });

      res.statusCode = 404;
      res.setHeader("content-type", "application/json");
      res.setHeader("x-request-id", requestId);
      res.setHeader("x-correlation-id", correlationId);
      res.end(JSON.stringify(payload));
      return;
    }

    // ── OpenClaw routes (/openclaw/*) ──
    if (path.startsWith("/openclaw/")) {
      req.on("data", (chunk) => { chunks.push(Buffer.from(chunk)); });
      req.on("end", async () => {
        try {
          const body = Buffer.concat(chunks).toString("utf8");
          const roles: string[] = [];
          const headerRole = headerValue(req.headers["x-actor-role"]);
          if (headerRole) {
            roles.push(headerRole);
          }
          if (workspaceId && actorId) {
            try {
              const r = await dependencies.workspaceService.getRolesForUser(actorId, workspaceId);
              for (const role of r) {
                if (!roles.includes(role)) roles.push(role);
              }
            } catch { /* anonymous context */ }
          }
          const ctx: import("@ethoxford/domain").RequestContext = {
            correlationId,
            roles,
            ...(workspaceId ? { workspaceId } : {}),
            ...(actorId ? { actorId } : {}),
          };
          const result = await handleOpenClawRequest(method, path, body, ctx, openClawDeps);
          const ocDuration = durationMs(startedAt);
          if (!result) {
            requestMetrics.record({ method, path, statusCode: 404, durationMs: ocDuration, errorCode: "not_found" });
            res.statusCode = 404;
            res.setHeader("content-type", "application/json");
            applySecurityHeaders(res);
            res.setHeader("x-request-id", requestId);
            res.setHeader("x-correlation-id", correlationId);
            res.end(JSON.stringify(apiError(correlationId, "not_found", "OpenClaw route not found", { path })));
            return;
          }
          requestMetrics.record({ method, path, statusCode: result.statusCode, durationMs: ocDuration });
          logger.log({ event: result.statusCode < 400 ? "request.complete" : "request.error", requestId, correlationId, method, path, statusCode: result.statusCode, durationMs: ocDuration });
          res.statusCode = result.statusCode;
          res.setHeader("content-type", "application/json");
          applySecurityHeaders(res);
          res.setHeader("x-request-id", requestId);
          res.setHeader("x-correlation-id", correlationId);
          res.end(JSON.stringify(result.payload));
        } catch (error: unknown) {
          const failDur = durationMs(startedAt);
          const msg = error instanceof Error ? error.message : "Unknown error";
          requestMetrics.record({ method, path, statusCode: 500, durationMs: failDur, errorCode: "internal_error" });
          logger.log({ event: "request.error", requestId, correlationId, method, path, statusCode: 500, durationMs: failDur, errorCode: "internal_error", errorMessage: msg });
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          applySecurityHeaders(res);
          res.setHeader("x-request-id", requestId);
          res.setHeader("x-correlation-id", correlationId);
          res.end(JSON.stringify(apiError(correlationId, "internal_error", msg)));
        }
      });
      return;
    }

    if (method === "GET" && path === "/metrics/ai") {
      const requestedWorkspaceId = parsedUrl.searchParams.get("workspaceId") ?? undefined;
      let workspaceId: string;

      try {
        const scope = await resolveAiObservabilityWorkspace(
          req.headers as Record<string, string | string[] | undefined>,
          dependencies,
          requestedWorkspaceId,
        );
        workspaceId = scope.workspaceId;
      } catch (error: unknown) {
        if (error instanceof DomainError) {
          const statusCode = mapDomainErrorToStatus(error);
          const metricsDuration = durationMs(startedAt);
          requestMetrics.record({
            method,
            path,
            statusCode,
            durationMs: metricsDuration,
            errorCode: error.code,
          });
          tenantMetrics.record({
            method,
            path,
            statusCode,
            errorCode: error.code,
            errorMessage: error.message,
          });

          logger.log({
            event: "request.error",
            ...requestContext,
            ...(requestedWorkspaceId ? { workspaceId: requestedWorkspaceId } : {}),
            statusCode,
            durationMs: metricsDuration,
            errorCode: error.code,
            errorMessage: error.message,
            ...(isDeniedError(error.code)
              ? { denialClass: error.code, targetResource: path }
              : {}),
          });

          res.statusCode = statusCode;
          res.setHeader("content-type", "application/json");
          res.setHeader("x-request-id", requestId);
          res.setHeader("x-correlation-id", correlationId);
          res.end(JSON.stringify(apiError(correlationId, error.code, error.message, error.details)));
          return;
        }

        throw error;
      }

      const runs = await dependencies.agentRuntimeService.listRuns();
      const toolCalls = await dependencies.agentRuntimeService.listToolCalls();
      const snapshot = summarizeAiRuntimeMetrics({
        runs: runs.filter((run) => run.workspaceId === workspaceId),
        toolCalls: toolCalls.filter((call) => call.workspaceId === workspaceId),
        workspaceId,
      });

      const metricsDuration = durationMs(startedAt);
      requestMetrics.record({
        method,
        path,
        statusCode: 200,
        durationMs: metricsDuration,
      });
      tenantMetrics.record({
        method,
        path,
        statusCode: 200,
      });

      logger.log({
        event: "request.complete",
        ...requestContext,
        workspaceId,
        statusCode: 200,
        durationMs: metricsDuration,
      });

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.setHeader("x-request-id", requestId);
      res.setHeader("x-correlation-id", correlationId);
      res.end(JSON.stringify(snapshot));
      return;
    }

    if (method === "GET" && path === "/alerts/ai") {
      const requestedWorkspaceId = parsedUrl.searchParams.get("workspaceId") ?? undefined;
      let workspaceId: string;

      try {
        const scope = await resolveAiObservabilityWorkspace(
          req.headers as Record<string, string | string[] | undefined>,
          dependencies,
          requestedWorkspaceId,
        );
        workspaceId = scope.workspaceId;
      } catch (error: unknown) {
        if (error instanceof DomainError) {
          const statusCode = mapDomainErrorToStatus(error);
          const alertDuration = durationMs(startedAt);
          requestMetrics.record({
            method,
            path,
            statusCode,
            durationMs: alertDuration,
            errorCode: error.code,
          });
          tenantMetrics.record({
            method,
            path,
            statusCode,
            errorCode: error.code,
            errorMessage: error.message,
          });

          logger.log({
            event: "request.error",
            ...requestContext,
            ...(requestedWorkspaceId ? { workspaceId: requestedWorkspaceId } : {}),
            statusCode,
            durationMs: alertDuration,
            errorCode: error.code,
            errorMessage: error.message,
            ...(isDeniedError(error.code)
              ? { denialClass: error.code, targetResource: path }
              : {}),
          });

          res.statusCode = statusCode;
          res.setHeader("content-type", "application/json");
          res.setHeader("x-request-id", requestId);
          res.setHeader("x-correlation-id", correlationId);
          res.end(JSON.stringify(apiError(correlationId, error.code, error.message, error.details)));
          return;
        }

        throw error;
      }

      const runs = await dependencies.agentRuntimeService.listRuns();
      const toolCalls = await dependencies.agentRuntimeService.listToolCalls();
      const snapshot = summarizeAiRuntimeMetrics({
        runs: runs.filter((run) => run.workspaceId === workspaceId),
        toolCalls: toolCalls.filter((call) => call.workspaceId === workspaceId),
        workspaceId,
      });
      const thresholds = {
        minRunCount: parseThreshold(
          parsedUrl.searchParams.get("minRunCount"),
          DEFAULT_AI_ALERT_THRESHOLDS.minRunCount,
        ),
        p1RunFailureRate: parseThreshold(
          parsedUrl.searchParams.get("p1RunFailureRate"),
          DEFAULT_AI_ALERT_THRESHOLDS.p1RunFailureRate,
        ),
        p2PolicyBlockRate: parseThreshold(
          parsedUrl.searchParams.get("p2PolicyBlockRate"),
          DEFAULT_AI_ALERT_THRESHOLDS.p2PolicyBlockRate,
        ),
        p2ModerationBlockRate: parseThreshold(
          parsedUrl.searchParams.get("p2ModerationBlockRate"),
          DEFAULT_AI_ALERT_THRESHOLDS.p2ModerationBlockRate,
        ),
        p2SchemaMismatchRate: parseThreshold(
          parsedUrl.searchParams.get("p2SchemaMismatchRate"),
          DEFAULT_AI_ALERT_THRESHOLDS.p2SchemaMismatchRate,
        ),
        p2AverageCostPerRunUsd: parseThreshold(
          parsedUrl.searchParams.get("p2AverageCostPerRunUsd"),
          DEFAULT_AI_ALERT_THRESHOLDS.p2AverageCostPerRunUsd,
        ),
      };
      const evaluation = evaluateAiRuntimeAlerts(snapshot, thresholds);

      const alertDuration = durationMs(startedAt);
      requestMetrics.record({
        method,
        path,
        statusCode: 200,
        durationMs: alertDuration,
      });
      tenantMetrics.record({
        method,
        path,
        statusCode: 200,
      });

      logger.log({
        event: "request.complete",
        ...requestContext,
        workspaceId,
        statusCode: 200,
        durationMs: alertDuration,
      });

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.setHeader("x-request-id", requestId);
      res.setHeader("x-correlation-id", correlationId);
      res.end(JSON.stringify(evaluation));
      return;
    }

    req.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    req.on("error", () => {
      const streamErrorDuration = durationMs(startedAt);
      requestMetrics.record({
        method,
        path,
        statusCode: 400,
        durationMs: streamErrorDuration,
        errorCode: "validation_denied",
      });
      tenantMetrics.record({
        method,
        path,
        statusCode: 400,
        errorCode: "validation_denied",
        errorMessage: "Invalid request stream",
      });

      logger.log({
        event: "request.error",
        ...requestContext,
        statusCode: 400,
        durationMs: streamErrorDuration,
        errorCode: "validation_denied",
        errorMessage: "Invalid request stream",
      });

      res.statusCode = 400;
      res.setHeader("content-type", "application/json");
      applySecurityHeaders(res);
      res.setHeader("x-request-id", requestId);
      res.setHeader("x-correlation-id", correlationId);
      res.end(
        JSON.stringify({
          ok: false,
          code: "validation_denied",
          message: "Invalid request stream",
          correlationId,
        }),
      );
    });

    req.on("end", async () => {
      try {
        const body = Buffer.concat(chunks).toString("utf8");
        const result = await handleRequest(
          {
            method,
            url: req.url ?? "/",
            headers: {
              ...req.headers,
              "x-request-id": requestId,
              "x-correlation-id": correlationId,
            },
            body,
          },
          dependencies,
        );

        const completeDuration = durationMs(startedAt);
        const error = parseErrorPayload(result.payload);

        const metricInput: {
          method: string;
          path: string;
          statusCode: number;
          durationMs: number;
          errorCode?: ApiErrorCode | "unknown_error";
        } = {
          method,
          path,
          statusCode: result.statusCode,
          durationMs: completeDuration,
        };

        if (error) {
          metricInput.errorCode = error.code;
        }

        requestMetrics.record(metricInput);
        tenantMetrics.record({
          method,
          path,
          statusCode: result.statusCode,
          ...(error ? { errorCode: error.code, errorMessage: error.message } : {}),
        });

        if (error) {
          const errorCode: ApiErrorCode = error.code;

          logger.log({
            event: "request.error",
            ...requestContext,
            statusCode: result.statusCode,
            durationMs: completeDuration,
            errorCode,
            errorMessage: error.message,
            ...(isDeniedError(errorCode)
              ? { denialClass: errorCode, targetResource: path }
              : {}),
          });
        } else {
          logger.log({
            event: "request.complete",
            ...requestContext,
            statusCode: result.statusCode,
            durationMs: completeDuration,
          });
        }

        res.statusCode = result.statusCode;
        res.setHeader("content-type", "application/json");
        applySecurityHeaders(res);
        res.setHeader("x-request-id", requestId);
        res.setHeader("x-correlation-id", correlationId);
        res.end(JSON.stringify(result.payload));
      } catch (error: unknown) {
        const failureDuration = durationMs(startedAt);
        requestMetrics.record({
          method,
          path,
          statusCode: 500,
          durationMs: failureDuration,
          errorCode: "internal_error",
        });
        tenantMetrics.record({
          method,
          path,
          statusCode: 500,
          errorCode: "internal_error",
          errorMessage: error instanceof Error ? error.message : "Unknown server error",
        });

        logger.log({
          event: "request.error",
          ...requestContext,
          statusCode: 500,
          durationMs: failureDuration,
          errorCode: "internal_error",
          errorMessage: error instanceof Error ? error.message : "Unknown server error",
        });

        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
        applySecurityHeaders(res);
        res.setHeader("x-request-id", requestId);
        res.setHeader("x-correlation-id", correlationId);
        res.end(
          JSON.stringify({
            ok: false,
            code: "internal_error",
            message: "Unexpected server error",
            correlationId,
          }),
        );
      }
    });
  });
}

export function startApiServer(options: ApiServerOptions = {}): Server {
  const runtime = options.runtime ?? loadRuntimeConfig();
  const logger = options.logger ?? new StructuredLogger("api");
  const server = createApiServer({
    ...options,
    runtime,
    logger,
  });

  server.listen(runtime.port, () => {
    console.log(
      `API server listening on port ${runtime.port} (appEnv=${runtime.appEnv}, nodeEnv=${runtime.nodeEnv})`,
    );
  });

  return server;
}

if (isExecutedDirectly()) {
  const _server = startApiServer();
  // Ignore stray SIGINT/SIGTERM during the first 5 seconds (IDE terminals
  // sometimes deliver a spurious signal right after process spawn).
  const _ignoreUntil = Date.now() + 5_000;
  const _graceful = (sig: string) => {
    if (Date.now() < _ignoreUntil) {
      console.log(`[api] Ignoring early ${sig} (startup grace period)`);
      return;
    }
    console.log(`[api] Received ${sig}, shutting down gracefully …`);
    _server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5_000).unref();
  };
  process.on("SIGINT", () => _graceful("SIGINT"));
  process.on("SIGTERM", () => _graceful("SIGTERM"));
}
