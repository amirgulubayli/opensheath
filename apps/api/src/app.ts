import { randomUUID } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

import {
  CONTRACTS_VERSION,
  type AnalyticsPayloadValidationStatus,
  type AgentRunRecord,
  createEventEnvelope,
  apiError,
  apiSuccess,
  type ApiResponse,
  type AutomationRule,
  type AutomationRun,
  type CitationProvenance,
  type ConfidenceBand,
  type ConnectorRecord,
  type DocumentAsset,
  type DocumentEvent,
  type EntitlementStatus,
  type EntitlementSnapshot,
  type EventEnvelope,
  type EventIngestionRecord,
  type EvidenceType,
  type HealthResponse,
  type NotificationChannelPreferences,
  type NotificationPreferenceRecord,
  type OAuthExchangeRequest,
  type OAuthExchangeResponse,
  type OAuthProvider,
  type OutboundWebhookDeliveryRecord,
  type ProjectEvent,
  type ProjectRecord,
  type RetrievalMethod,
  type RetrievalResultItem,
  type ToolCallRecord,
  type SignInRequest,
  type SignInResponse,
  type SignUpRequest,
  type SessionRefreshResponse,
  type AnalyticsPayloadValidationStatus,
  type EntitlementIntegrityAnomaly,
  type AnalyticsEventRecord,
} from "@ethoxford/contracts";
import {
  DomainError,
  type AuthService,
  type ConnectorAuthType,
  type ConnectorHealthStatus,
  type RequestContext,
  type Role,
  type ReleaseGate,
  ReleaseReadinessService,
} from "@ethoxford/domain";

export interface AppDependencies {
  authService: AuthService;
  workspaceService: WorkspaceService;
  projectService: ProjectService;
  ingestionService: IngestionService;
  retrievalService: RetrievalService;
  eventBus: EventBus;
  automationEngine: AutomationEngine;
  connectorService: ConnectorService;
  notificationPreferenceService: NotificationPreferenceService;
  webhookDeliveryService: WebhookDeliveryService;
  agentRuntimeService: AgentRuntimeService;
  billingService: BillingService;
  releaseReadinessService: ReleaseReadinessService;
}

type MaybePromise<T> = T | Promise<T>;

export interface ProjectService {
  createProject(
    context: RequestContext,
    input: { name: string; description?: string },
  ): MaybePromise<ProjectRecord>;
  updateProject(
    context: RequestContext,
    projectId: string,
    input: { name?: string; description?: string },
  ): MaybePromise<ProjectRecord>;
  transitionStatus(
    context: RequestContext,
    projectId: string,
    nextStatus: ProjectRecord["status"],
  ): MaybePromise<ProjectRecord>;
  listByWorkspace(workspaceId: string): MaybePromise<ProjectRecord[]>;
  getActivity(context: RequestContext, projectId: string): MaybePromise<ProjectEvent[]>;
}

export interface WorkspaceService {
  createWorkspace(ownerUserId: string, name: string): MaybePromise<{ workspaceId: string; name: string; ownerUserId: string }>;
  inviteMember(
    context: RequestContext,
    workspaceId: string,
    email: string,
    role: Role,
  ): MaybePromise<string>;
  acceptInvite(inviteToken: string, userId: string): MaybePromise<{ workspaceId: string; userId: string; role: Role }>;
  updateRole(
    context: RequestContext,
    workspaceId: string,
    targetUserId: string,
    role: Role,
  ): MaybePromise<{ workspaceId: string; userId: string; role: Role }>;
  removeMember(
    context: RequestContext,
    workspaceId: string,
    targetUserId: string,
  ): MaybePromise<void>;
  listMembers(workspaceId: string): MaybePromise<Array<{ workspaceId: string; userId: string; role: Role }>>;
  getRolesForUser(userId: string, workspaceId: string): MaybePromise<Role[]>;
}

export interface IngestionService {
  createDocument(
    context: RequestContext,
    input: { name: string; source: string },
  ): MaybePromise<DocumentAsset>;
  markProcessing(context: RequestContext, documentId: string): MaybePromise<DocumentAsset>;
  markCompleted(
    context: RequestContext,
    documentId: string,
    chunkCount: number,
  ): MaybePromise<DocumentAsset>;
  markFailed(
    context: RequestContext,
    documentId: string,
    errorMessage: string,
    errorClass?: string,
  ): MaybePromise<DocumentAsset>;
  retry(
    context: RequestContext,
    documentId: string,
    options?: { replayDeadLetter?: boolean; correlationId?: string },
  ): MaybePromise<DocumentAsset>;
  listByWorkspace(workspaceId: string): MaybePromise<DocumentAsset[]>;
  getActivity(context: RequestContext, documentId: string): MaybePromise<DocumentEvent[]>;
}

export interface RetrievalService {
  indexChunks(
    context: RequestContext,
    input: {
      documentId: string;
      sourceUri: string;
      sourceTitle: string;
      embeddingModelVersion: string;
      chunks: Array<{
        text: string;
        chunkStartOffset: number;
        chunkEndOffset: number;
        indexedAt?: string;
        chunkId?: string;
      }>;
    },
  ): MaybePromise<
    Array<{
      chunkId: string;
      workspaceId: string;
      documentId: string;
      sourceUri: string;
      sourceTitle: string;
      text: string;
      chunkStartOffset: number;
      chunkEndOffset: number;
      embeddingModelVersion: string;
      indexedAt: string;
    }>
  >;
  query(
    context: RequestContext,
    input: {
      query: string;
      method?: RetrievalMethod;
      limit?: number;
      minScore?: number;
    },
  ): MaybePromise<RetrievalResultItem[]>;
  recordCitation(
    context: RequestContext,
    input: {
      agentRunId: string;
      responseSegmentId: string;
      documentId: string;
      chunkId: string;
      evidenceType: EvidenceType;
      confidenceScore: number;
      citationId?: string;
      confidenceBand?: ConfidenceBand;
    },
  ): MaybePromise<CitationProvenance>;
  listCitations(
    context: RequestContext,
    agentRunId?: string,
  ): MaybePromise<CitationProvenance[]>;
}

export interface AgentRuntimeService {
  execute(
    context: RequestContext,
    input: {
      toolName: string;
      toolInput: unknown;
      confirmHighRiskAction?: boolean;
      threadId?: string;
    },
  ): MaybePromise<{ run: AgentRunRecord; toolCall: ToolCallRecord; output?: unknown }>;
  listRuns(workspaceId?: string): MaybePromise<AgentRunRecord[]>;
  listToolCalls(workspaceId?: string): MaybePromise<ToolCallRecord[]>;
  listToolCallsByRun(runId: string, workspaceId?: string): MaybePromise<ToolCallRecord[]>;
}

export interface BillingService {
  reconcileWebhook(input: {
    sourceEventId: string;
    workspaceId: string;
    type:
      | "subscription.activated"
      | "subscription.changed"
      | "subscription.canceled"
      | "invoice.payment_failed";
    planId?: string;
  }): MaybePromise<{
    subscriptionId: string;
    workspaceId: string;
    planId: string;
    state: string;
    sourceEventId: string;
    lastSyncedAt: string;
    updatedAt: string;
    correlationId?: string;
    providerCustomerId?: string;
    providerSubscriptionId?: string;
  }>;
  setEntitlementPolicy(policy: {
    planId: string;
    features: Record<string, boolean>;
    quotas: Record<string, number>;
  }): MaybePromise<void>;
  recordUsage(
    workspaceId: string,
    metric: string,
    amount?: number,
    options?: { idempotencyKey?: string; correlationId?: string },
  ): MaybePromise<void>;
  checkQuota(
    workspaceId: string,
    metric: string,
  ): MaybePromise<{ allowed: boolean; remaining: number }>;
  checkFeature(workspaceId: string, feature: string): MaybePromise<boolean>;
  getUiStatus(workspaceId: string): MaybePromise<string>;
  recordAnalyticsEvent(input: {
    workspaceId: string;
    eventName: string;
    eventVersion: string;
    correlationId: string;
    entitlementSnapshot: EntitlementSnapshot;
    payloadValidationStatus: AnalyticsPayloadValidationStatus;
    payload?: Record<string, unknown>;
    planId?: string;
    actorId?: string;
    occurredAt?: string;
    idempotencyKey?: string;
  }): MaybePromise<AnalyticsEventRecord>;
  listAnalyticsEvents(workspaceId?: string): MaybePromise<AnalyticsEventRecord[]>;
  listIntegrityAnomalies(workspaceId?: string): MaybePromise<EntitlementIntegrityAnomaly[]>;
}

export interface ConnectorService {
  registerConnector(
    context: RequestContext,
    input: { provider: string; authType: ConnectorAuthType; credentialReference: string },
  ): MaybePromise<ConnectorRecord>;
  recordHealth(
    context: RequestContext,
    connectorId: string,
    healthStatus: ConnectorHealthStatus,
    options?: { errorMessage?: string },
  ): MaybePromise<ConnectorRecord>;
  revokeConnector(context: RequestContext, connectorId: string): MaybePromise<ConnectorRecord>;
  listByWorkspace(workspaceId: string): MaybePromise<ConnectorRecord[]>;
}

export interface EventBus {
  publish(
    event: EventEnvelope<string, Record<string, unknown>>,
    sourceSystem: string,
    sourceEventId?: string,
    options?: { signatureVerified?: boolean },
  ): MaybePromise<boolean>;
  listIngestionRecords(workspaceId?: string): MaybePromise<EventIngestionRecord[]>;
}

export interface AutomationEngine {
  registerAction(actionName: string, action: (event: EventEnvelope<string, Record<string, unknown>>) => Promise<void>): void;
  addRule(rule: Omit<AutomationRule, "ruleId">): MaybePromise<AutomationRule>;
  process(event: EventEnvelope<string, Record<string, unknown>>): MaybePromise<void>;
  listRuns(workspaceId?: string): MaybePromise<AutomationRun[]>;
  listRules(workspaceId?: string): MaybePromise<AutomationRule[]>;
}

export interface NotificationPreferenceService {
  upsert(
    context: RequestContext,
    input: { channels: NotificationChannelPreferences; userId?: string },
  ): MaybePromise<NotificationPreferenceRecord>;
  getForUser(context: RequestContext, userId?: string): MaybePromise<NotificationPreferenceRecord>;
  listByWorkspace(workspaceId: string): MaybePromise<NotificationPreferenceRecord[]>;
}

export interface WebhookDeliveryService {
  enqueue(
    context: RequestContext,
    input: { targetUrl: string; eventType: string; eventId: string; payload: Record<string, unknown>; maxAttempts?: number },
  ): MaybePromise<OutboundWebhookDeliveryRecord>;
  recordAttempt(
    context: RequestContext,
    deliveryId: string,
    input: { success: boolean; errorMessage?: string },
  ): MaybePromise<OutboundWebhookDeliveryRecord>;
  replay(context: RequestContext, deliveryId: string): MaybePromise<OutboundWebhookDeliveryRecord>;
  listByWorkspace(workspaceId: string): MaybePromise<OutboundWebhookDeliveryRecord[]>;
}

export interface AppRequest {
  method: string;
  url: string;
  headers: IncomingHttpHeaders;
  body: string;
}

export interface AppResult {
  statusCode: number;
  payload: ApiResponse<unknown>;
}

function mapErrorToStatus(error: DomainError): number {
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

function readHeader(headers: IncomingHttpHeaders, key: string): string | undefined {
  const value = headers[key];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseJsonBody(rawBody: string): Record<string, unknown> {
  try {
    return JSON.parse(rawBody || "{}");
  } catch {
    throw new DomainError("validation_denied", "Invalid JSON body", {
      reason: "json_parse_failed",
    });
  }
}

function requireString(
  payload: Record<string, unknown>,
  fieldName: string,
): string {
  const value = payload[fieldName];

  if (typeof value !== "string" || !value.trim()) {
    throw new DomainError("validation_denied", `${fieldName} is required`, {
      field: fieldName,
    });
  }

  return value;
}

function chunkText(
  content: string,
  options?: { chunkSize?: number; overlap?: number },
): Array<{ text: string; chunkStartOffset: number; chunkEndOffset: number }> {
  const chunkSize = Math.max(200, Math.floor(options?.chunkSize ?? 800));
  const overlap = Math.max(0, Math.floor(options?.overlap ?? 120));

  if (!content.trim()) {
    throw new DomainError("validation_denied", "content is required", {
      field: "content",
    });
  }

  const length = content.length;
  const chunks: Array<{ text: string; chunkStartOffset: number; chunkEndOffset: number }> = [];
  let start = 0;
  const effectiveOverlap = Math.min(overlap, Math.max(0, chunkSize - 1));

  while (start < length) {
    const end = Math.min(start + chunkSize, length);
    const text = content.slice(start, end);
    if (text.trim()) {
      chunks.push({
        text,
        chunkStartOffset: start,
        chunkEndOffset: Math.max(start, end - 1),
      });
    }

    if (end >= length) {
      break;
    }

    start = end - effectiveOverlap;
  }

  return chunks;
}

function requireBoolean(
  payload: Record<string, unknown>,
  fieldName: string,
): boolean {
  const value = payload[fieldName];

  if (typeof value !== "boolean") {
    throw new DomainError("validation_denied", `${fieldName} must be a boolean`, {
      field: fieldName,
    });
  }

  return value;
}

function parseRoles(headers: IncomingHttpHeaders): Role[] {
  const raw = readHeader(headers, "x-roles");

  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((role) => role.trim())
    .filter((role) => role.length > 0) as Role[];
}

function buildContext(
  headers: IncomingHttpHeaders,
  overrides?: {
    workspaceId?: string;
  },
): RequestContext {
  const actorId = readHeader(headers, "x-actor-id");
  const workspaceId = overrides?.workspaceId ?? readHeader(headers, "x-workspace-id");

  return {
    correlationId: readHeader(headers, "x-correlation-id") ?? "corr_local_default",
    roles: parseRoles(headers),
    ...(actorId ? { actorId } : {}),
    ...(workspaceId ? { workspaceId } : {}),
  };
}

async function buildMemberContext(
  headers: IncomingHttpHeaders,
  dependencies: AppDependencies,
  overrides?: {
    workspaceId?: string;
  },
): Promise<RequestContext> {
  const correlationId = readHeader(headers, "x-correlation-id") ?? "corr_local_default";
  const sessionId = readHeader(headers, "x-session-id");
  const demoMode = sessionId === "demo" || readHeader(headers, "x-demo-mode") === "true";
  let actorId = readHeader(headers, "x-actor-id");
  let workspaceId = overrides?.workspaceId ?? readHeader(headers, "x-workspace-id");

  if (demoMode) {
    actorId = actorId ?? "usr_demo";
    workspaceId = workspaceId ?? "ws_demo";

    return {
      correlationId,
      actorId,
      workspaceId,
      roles: ["owner"],
    };
  }

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
    throw new DomainError("validation_denied", "workspaceId is required in context", {
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
    correlationId,
    actorId,
    workspaceId,
    roles,
  };
}

function parseSignInBody(rawBody: string): SignInRequest {
  const payload = parseJsonBody(rawBody);

  if (
    typeof payload.email !== "string" ||
    typeof payload.password !== "string" ||
    payload.email.trim() === "" ||
    payload.password.trim() === ""
  ) {
    throw new DomainError("validation_denied", "email and password are required", {
      field: "email,password",
    });
  }

  return {
    email: payload.email,
    password: payload.password,
  };
}

function parseSignUpBody(rawBody: string): SignUpRequest {
  const payload = parseJsonBody(rawBody);

  if (
    typeof payload.email !== "string" ||
    typeof payload.password !== "string" ||
    payload.email.trim() === "" ||
    payload.password.trim() === ""
  ) {
    throw new DomainError("validation_denied", "email and password are required", {
      field: "email,password",
    });
  }

  const workspaceId =
    typeof payload.workspaceId === "string" && payload.workspaceId.trim() !== ""
      ? payload.workspaceId.trim()
      : undefined;

  return {
    email: payload.email,
    password: payload.password,
    ...(workspaceId ? { workspaceId } : {}),
  };
}

function parseOAuthProvider(value: string): OAuthProvider {
  if (value === "google" || value === "github" || value === "microsoft") {
    return value;
  }

  throw new DomainError("validation_denied", "Invalid OAuth provider", {
    provider: value,
  });
}

function parseOAuthExchangeBody(rawBody: string): OAuthExchangeRequest {
  const payload = parseJsonBody(rawBody);
  const provider = parseOAuthProvider(requireString(payload, "provider"));
  const authorizationCode = requireString(payload, "authorizationCode");
  const state = requireString(payload, "state");
  const email = requireString(payload, "email");
  const providerAccountId = requireString(payload, "providerAccountId");
  const workspaceId =
    typeof payload.workspaceId === "string" && payload.workspaceId.trim() !== ""
      ? payload.workspaceId.trim()
      : undefined;

  return {
    provider,
    authorizationCode,
    state,
    email,
    providerAccountId,
    ...(workspaceId ? { workspaceId } : {}),
  };
}

function parseReleaseGate(value: string): ReleaseGate {
  const gates: ReleaseGate[] = [
    "architecture",
    "ci_cd",
    "auth_shell",
    "tenant_isolation",
    "core_workflow",
    "discoverability",
    "ai_action",
    "ai_quality",
    "automation",
    "billing_sync",
    "beta_readiness",
    "ga_launch",
  ];

  if (!gates.includes(value as ReleaseGate)) {
    throw new DomainError("validation_denied", "Invalid release gate", {
      gate: value,
    });
  }

  return value as ReleaseGate;
}

function parseRetrievalMethod(value: string): RetrievalMethod {
  if (value === "semantic" || value === "keyword" || value === "hybrid") {
    return value;
  }

  throw new DomainError("validation_denied", "Invalid retrieval method", {
    method: value,
  });
}

function parseEvidenceTypeValue(value: string): EvidenceType {
  if (value === "direct" || value === "supporting" || value === "inferred") {
    return value;
  }

  throw new DomainError("validation_denied", "Invalid evidence type", {
    evidenceType: value,
  });
}

function parseConfidenceBandValue(value: string): ConfidenceBand {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  throw new DomainError("validation_denied", "Invalid confidence band", {
    confidenceBand: value,
  });
}

function parseConnectorAuthType(value: string): ConnectorAuthType {
  if (value === "oauth" || value === "api_key") {
    return value;
  }

  throw new DomainError("validation_denied", "Invalid connector auth type", {
    authType: value,
  });
}

function parseConnectorHealthStatus(value: string): ConnectorHealthStatus {
  if (value === "healthy" || value === "degraded" || value === "unreachable") {
    return value;
  }

  throw new DomainError("validation_denied", "Invalid connector health status", {
    healthStatus: value,
  });
}

function parseEntitlementStatus(value: string): EntitlementStatus {
  if (value === "enabled" || value === "disabled" || value === "grace") {
    return value;
  }

  throw new DomainError("validation_denied", "Invalid entitlement status", {
    entitlementStatus: value,
  });
}

function parseAnalyticsPayloadValidationStatus(
  value: string,
): AnalyticsPayloadValidationStatus {
  if (value === "valid" || value === "missing_required_fields" || value === "invalid_schema") {
    return value;
  }

  throw new DomainError("validation_denied", "Invalid payloadValidationStatus", {
    payloadValidationStatus: value,
  });
}

function parseNumeric(value: unknown, fieldName: string, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new DomainError("validation_denied", `${fieldName} must be a number`, {
      field: fieldName,
    });
  }

  return value;
}

function parseRequiredInteger(payload: Record<string, unknown>, fieldName: string): number {
  const parsed = parseNumeric(payload[fieldName], fieldName, Number.NaN);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new DomainError("validation_denied", `${fieldName} must be a non-negative integer`, {
      field: fieldName,
    });
  }

  return parsed;
}

export async function handleRequest(
  request: AppRequest,
  dependencies: AppDependencies,
): Promise<AppResult> {
  const correlationId =
    (Array.isArray(request.headers["x-correlation-id"])
      ? request.headers["x-correlation-id"][0]
      : request.headers["x-correlation-id"]) ?? "corr_local_default";

  const url = new URL(request.url, "http://localhost");
  const path = url.pathname;

  try {
    if (request.method === "GET" && path === "/health") {
      const data: HealthResponse = {
        service: "api",
        status: "ok",
        version: CONTRACTS_VERSION,
        now: new Date().toISOString(),
      };

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, data),
      };
    }

    if (request.method === "POST" && path === "/auth/sign-in") {
      const input = parseSignInBody(request.body);
      const session = await dependencies.authService.signIn(input);

      const data: SignInResponse = {
        session,
      };

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, data),
      };
    }

    if (request.method === "POST" && path === "/auth/sign-up") {
      const input = parseSignUpBody(request.body);
      const session = await dependencies.authService.signUp(input);

      const data: SignInResponse = {
        session,
      };

      return {
        statusCode: 201,
        payload: apiSuccess(correlationId, data),
      };
    }

    if (request.method === "POST" && path === "/auth/oauth/exchange") {
      const input = parseOAuthExchangeBody(request.body);
      const exchange = await dependencies.authService.signInWithOAuth(input);

      const data: OAuthExchangeResponse = exchange;

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, data),
      };
    }

    if (request.method === "POST" && path === "/auth/session/refresh") {
      const sessionId = readHeader(request.headers, "x-session-id");

      if (!sessionId) {
        throw new DomainError("auth_denied", "Missing x-session-id header", {
          reason: "missing_session_header",
        });
      }

      const session = await dependencies.authService.refreshSession(sessionId);
      const data: SessionRefreshResponse = {
        session,
        rotatedFromSessionId: sessionId,
      };

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, data),
      };
    }

    if (request.method === "GET" && path === "/auth/me") {
      const sessionId = readHeader(request.headers, "x-session-id");

      if (!sessionId) {
        throw new DomainError("auth_denied", "Missing x-session-id header", {
          reason: "missing_session_header",
        });
      }

      const session = await dependencies.authService.requireSession(sessionId);

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, {
          session,
        }),
      };
    }

    if (request.method === "POST" && path === "/auth/sign-out") {
      const sessionId = readHeader(request.headers, "x-session-id");

      if (!sessionId) {
        throw new DomainError("auth_denied", "Missing x-session-id header", {
          reason: "missing_session_header",
        });
      }

      await dependencies.authService.signOut(sessionId);

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, {
          signedOut: true,
        }),
      };
    }

    if (request.method === "POST" && path === "/workspaces/create") {
      const body = parseJsonBody(request.body);
      const ownerUserId = requireString(body, "ownerUserId");
      const name = requireString(body, "name");
      const workspace = await dependencies.workspaceService.createWorkspace(
        ownerUserId,
        name,
      );

      return {
        statusCode: 201,
        payload: apiSuccess(correlationId, { workspace }),
      };
    }

    if (request.method === "POST" && path === "/workspaces/invite") {
      const body = parseJsonBody(request.body);
      const workspaceId = requireString(body, "workspaceId");
      const email = requireString(body, "email");
      const role = requireString(body, "role") as Role;

      const memberContext = await buildMemberContext(request.headers, dependencies, {
        workspaceId,
      });
      const inviteToken = await dependencies.workspaceService.inviteMember(
        memberContext,
        workspaceId,
        email,
        role,
      );

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { inviteToken }),
      };
    }

    if (request.method === "POST" && path === "/workspaces/accept-invite") {
      const body = parseJsonBody(request.body);
      const inviteToken = requireString(body, "inviteToken");
      const userId = requireString(body, "userId");

      const membership = await dependencies.workspaceService.acceptInvite(
        inviteToken,
        userId,
      );
      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { membership }),
      };
    }

    if (request.method === "GET" && path === "/workspaces/members") {
      const workspaceId = url.searchParams.get("workspaceId");

      if (!workspaceId) {
        throw new DomainError("validation_denied", "workspaceId query param is required", {
          field: "workspaceId",
        });
      }

      const memberContext = await buildMemberContext(request.headers, dependencies, {
        workspaceId,
      });

      if (!memberContext.roles.includes("owner") && !memberContext.roles.includes("admin")) {
        throw new DomainError("policy_denied", "Only owners/admins can list workspace members", {
          workspaceId,
        });
      }

      const members = await dependencies.workspaceService.listMembers(workspaceId);
      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { members }),
      };
    }

    if (request.method === "POST" && path === "/workspaces/members/update-role") {
      const body = parseJsonBody(request.body);
      const workspaceId = requireString(body, "workspaceId");
      const targetUserId = requireString(body, "targetUserId");
      const role = requireString(body, "role") as Role;

      const memberContext = await buildMemberContext(request.headers, dependencies, {
        workspaceId,
      });

      if (!memberContext.roles.includes("owner") && !memberContext.roles.includes("admin")) {
        throw new DomainError("policy_denied", "Only owners/admins can update roles", {
          workspaceId,
        });
      }

      const membership = await dependencies.workspaceService.updateRole(
        memberContext,
        workspaceId,
        targetUserId,
        role,
      );

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { membership }),
      };
    }

    if (request.method === "POST" && path === "/workspaces/members/remove") {
      const body = parseJsonBody(request.body);
      const workspaceId = requireString(body, "workspaceId");
      const targetUserId = requireString(body, "targetUserId");

      const memberContext = await buildMemberContext(request.headers, dependencies, {
        workspaceId,
      });

      if (!memberContext.roles.includes("owner") && !memberContext.roles.includes("admin")) {
        throw new DomainError("policy_denied", "Only owners/admins can remove members", {
          workspaceId,
        });
      }

      await dependencies.workspaceService.removeMember(memberContext, workspaceId, targetUserId);

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { removed: true }),
      };
    }

    if (request.method === "POST" && path === "/projects/create") {
      const body = parseJsonBody(request.body);
      const name = requireString(body, "name");
      const description = typeof body.description === "string" ? body.description : undefined;

      const projectInput: {
        name: string;
        description?: string;
      } = {
        name,
        ...(description ? { description } : {}),
      };

      const memberContext = await buildMemberContext(request.headers, dependencies);
      const project = await dependencies.projectService.createProject(
        memberContext,
        projectInput,
      );

      return {
        statusCode: 201,
        payload: apiSuccess(correlationId, { project }),
      };
    }

    if (request.method === "GET" && path === "/projects/list") {
      const workspaceId = url.searchParams.get("workspaceId");

      if (!workspaceId) {
        throw new DomainError("validation_denied", "workspaceId query param is required", {
          field: "workspaceId",
        });
      }

      const memberContext = await buildMemberContext(request.headers, dependencies, {
        workspaceId,
      });
      const projects = await dependencies.projectService.listByWorkspace(
        memberContext.workspaceId!,
      );
      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { projects }),
      };
    }

    if (request.method === "POST" && path === "/projects/update") {
      const body = parseJsonBody(request.body);
      const projectId = requireString(body, "projectId");
      const name = typeof body.name === "string" ? body.name : undefined;
      const description = typeof body.description === "string" ? body.description : undefined;

      if (name === undefined && description === undefined) {
        throw new DomainError("validation_denied", "name or description is required", {
          field: "name,description",
        });
      }

      const memberContext = await buildMemberContext(request.headers, dependencies);
      const project = await dependencies.projectService.updateProject(memberContext, projectId, {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
      });

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { project }),
      };
    }

    if (request.method === "POST" && path === "/projects/transition") {
      const body = parseJsonBody(request.body);
      const projectId = requireString(body, "projectId");
      const nextStatus = requireString(body, "nextStatus") as
        | "draft"
        | "active"
        | "archived";

      const memberContext = await buildMemberContext(request.headers, dependencies);
      const project = await dependencies.projectService.transitionStatus(
        memberContext,
        projectId,
        nextStatus,
      );

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { project }),
      };
    }

    if (request.method === "GET" && path === "/projects/activity") {
      const projectId = url.searchParams.get("projectId");

      if (!projectId) {
        throw new DomainError("validation_denied", "projectId query param is required", {
          field: "projectId",
        });
      }

      const memberContext = await buildMemberContext(request.headers, dependencies);
      const events = await dependencies.projectService.getActivity(
        memberContext,
        projectId,
      );

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { events }),
      };
    }

    if (request.method === "POST" && path === "/documents/create") {
      const body = parseJsonBody(request.body);
      const name = requireString(body, "name");
      const source = requireString(body, "source");

      const memberContext = await buildMemberContext(request.headers, dependencies);
      const document = await dependencies.ingestionService.createDocument(memberContext, {
        name,
        source,
      });

      return {
        statusCode: 201,
        payload: apiSuccess(correlationId, { document }),
      };
    }

    if (request.method === "POST" && path === "/documents/upload") {
      const body = parseJsonBody(request.body);
      const name = requireString(body, "name");
      const source = requireString(body, "source");
      const content = requireString(body, "content");
      const embeddingModelVersion =
        typeof body.embeddingModelVersion === "string"
          ? body.embeddingModelVersion
          : "demo-embedding";
      const chunkSize =
        body.chunkSize === undefined
          ? undefined
          : parseNumeric(body.chunkSize, "chunkSize", Number.NaN);
      const overlap =
        body.overlap === undefined ? undefined : parseNumeric(body.overlap, "overlap", Number.NaN);

      if (chunkSize !== undefined && Number.isNaN(chunkSize)) {
        throw new DomainError("validation_denied", "chunkSize is required when provided", {
          field: "chunkSize",
        });
      }

      if (overlap !== undefined && Number.isNaN(overlap)) {
        throw new DomainError("validation_denied", "overlap is required when provided", {
          field: "overlap",
        });
      }

      const memberContext = await buildMemberContext(request.headers, dependencies);
      const document = await dependencies.ingestionService.createDocument(memberContext, {
        name,
        source,
      });

      await dependencies.ingestionService.markProcessing(memberContext, document.documentId);

      try {
        const chunks = chunkText(content, {
          ...(chunkSize !== undefined ? { chunkSize } : {}),
          ...(overlap !== undefined ? { overlap } : {}),
        });

        await dependencies.retrievalService.indexChunks(memberContext, {
          documentId: document.documentId,
          sourceUri: source,
          sourceTitle: name,
          embeddingModelVersion,
          chunks,
        });

        const completed = await dependencies.ingestionService.markCompleted(
          memberContext,
          document.documentId,
          chunks.length,
        );

        return {
          statusCode: 201,
          payload: apiSuccess(correlationId, { document: completed, chunkCount: chunks.length }),
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unexpected ingestion error";
        await dependencies.ingestionService.markFailed(
          memberContext,
          document.documentId,
          message,
        );
        throw new DomainError("internal_error", "Ingestion pipeline failed", {
          documentId: document.documentId,
        });
      }
    }

    if (request.method === "POST" && path === "/documents/processing") {
      const body = parseJsonBody(request.body);
      const documentId = requireString(body, "documentId");

      const memberContext = await buildMemberContext(request.headers, dependencies);
      const document = await dependencies.ingestionService.markProcessing(
        memberContext,
        documentId,
      );

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { document }),
      };
    }

    if (request.method === "GET" && path === "/documents/list") {
      const workspaceId = url.searchParams.get("workspaceId");

      if (!workspaceId) {
        throw new DomainError("validation_denied", "workspaceId query param is required", {
          field: "workspaceId",
        });
      }

      const memberContext = await buildMemberContext(request.headers, dependencies, {
        workspaceId,
      });
      const documents = await dependencies.ingestionService.listByWorkspace(
        memberContext.workspaceId!,
      );

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { documents }),
      };
    }

    if (request.method === "POST" && path === "/documents/fail") {
      const body = parseJsonBody(request.body);
      const documentId = requireString(body, "documentId");
      const errorMessage = requireString(body, "errorMessage");

      const memberContext = await buildMemberContext(request.headers, dependencies);
      const document = await dependencies.ingestionService.markFailed(
        memberContext,
        documentId,
        errorMessage,
      );

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { document }),
      };
    }

    if (request.method === "POST" && path === "/documents/complete") {
      const body = parseJsonBody(request.body);
      const documentId = requireString(body, "documentId");
      const chunkCount = parseNumeric(body.chunkCount, "chunkCount", Number.NaN);

      if (!Number.isInteger(chunkCount) || chunkCount < 0) {
        throw new DomainError("validation_denied", "chunkCount must be a non-negative integer", {
          field: "chunkCount",
        });
      }

      const memberContext = await buildMemberContext(request.headers, dependencies);
      const document = await dependencies.ingestionService.markCompleted(
        memberContext,
        documentId,
        chunkCount,
      );

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { document }),
      };
    }

    if (request.method === "POST" && path === "/documents/retry") {
      const body = parseJsonBody(request.body);
      const documentId = requireString(body, "documentId");
      const replayDeadLetter =
        typeof body.replayDeadLetter === "boolean" ? body.replayDeadLetter : undefined;
      const correlationIdOverride =
        typeof body.correlationId === "string" ? body.correlationId : undefined;

      const memberContext = await buildMemberContext(request.headers, dependencies);
      const document = await dependencies.ingestionService.retry(memberContext, documentId, {
        ...(replayDeadLetter !== undefined ? { replayDeadLetter } : {}),
        ...(correlationIdOverride ? { correlationId: correlationIdOverride } : {}),
      });

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { document }),
      };
    }

    if (request.method === "GET" && path === "/documents/activity") {
      const documentId = url.searchParams.get("documentId");

      if (!documentId) {
        throw new DomainError("validation_denied", "documentId query param is required", {
          field: "documentId",
        });
      }

      const memberContext = await buildMemberContext(request.headers, dependencies);
      const events = await dependencies.ingestionService.getActivity(
        memberContext,
        documentId,
      );

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { events }),
      };
    }

    if (request.method === "POST" && path === "/retrieval/index-chunks") {
      const body = parseJsonBody(request.body);
      const documentId = requireString(body, "documentId");
      const sourceUri = requireString(body, "sourceUri");
      const sourceTitle = requireString(body, "sourceTitle");
      const embeddingModelVersion = requireString(body, "embeddingModelVersion");
      const chunksPayload = body.chunks;
      const memberContext = await buildMemberContext(request.headers, dependencies);

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
        const text = requireString(chunkBody, "text");
        const chunkStartOffset = parseNumeric(
          chunkBody.chunkStartOffset,
          "chunkStartOffset",
          Number.NaN,
        );
        const chunkEndOffset = parseNumeric(
          chunkBody.chunkEndOffset,
          "chunkEndOffset",
          Number.NaN,
        );

        if (!Number.isInteger(chunkStartOffset) || !Number.isInteger(chunkEndOffset)) {
          throw new DomainError("validation_denied", "chunk offsets must be integers", {
            field: `chunks[${index}].chunkStartOffset,chunkEndOffset`,
          });
        }

        const indexedAt = typeof chunkBody.indexedAt === "string" ? chunkBody.indexedAt : undefined;
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

      const indexed = await dependencies.retrievalService.indexChunks(memberContext, {
        documentId,
        sourceUri,
        sourceTitle,
        embeddingModelVersion,
        chunks,
      });

      return {
        statusCode: 201,
        payload: apiSuccess(correlationId, { indexed }),
      };
    }

    if (request.method === "POST" && path === "/retrieval/query") {
      const body = parseJsonBody(request.body);
      const query = requireString(body, "query");
      const method = typeof body.method === "string" ? parseRetrievalMethod(body.method) : undefined;
      const limit =
        body.limit === undefined ? undefined : parseNumeric(body.limit, "limit", Number.NaN);
      const minScore =
        body.minScore === undefined
          ? undefined
          : parseNumeric(body.minScore, "minScore", Number.NaN);
      const memberContext = await buildMemberContext(request.headers, dependencies);

      if (limit !== undefined && Number.isNaN(limit)) {
        throw new DomainError("validation_denied", "limit is required when provided", {
          field: "limit",
        });
      }

      if (minScore !== undefined && Number.isNaN(minScore)) {
        throw new DomainError("validation_denied", "minScore is required when provided", {
          field: "minScore",
        });
      }

      const results = await dependencies.retrievalService.query(memberContext, {
        query,
        ...(method ? { method } : {}),
        ...(limit !== undefined ? { limit } : {}),
        ...(minScore !== undefined ? { minScore } : {}),
      });

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { results }),
      };
    }

    if (request.method === "POST" && path === "/retrieval/citations") {
      const body = parseJsonBody(request.body);
      const agentRunId = requireString(body, "agentRunId");
      const responseSegmentId = requireString(body, "responseSegmentId");
      const documentId = requireString(body, "documentId");
      const chunkId = requireString(body, "chunkId");
      const evidenceType = parseEvidenceTypeValue(requireString(body, "evidenceType"));
      const confidenceScore = parseNumeric(body.confidenceScore, "confidenceScore", Number.NaN);
      const memberContext = await buildMemberContext(request.headers, dependencies);

      if (Number.isNaN(confidenceScore)) {
        throw new DomainError("validation_denied", "confidenceScore is required", {
          field: "confidenceScore",
        });
      }

      const citationId = typeof body.citationId === "string" ? body.citationId : undefined;
      const confidenceBand =
        typeof body.confidenceBand === "string"
          ? parseConfidenceBandValue(body.confidenceBand)
          : undefined;

      const citation = await dependencies.retrievalService.recordCitation(memberContext, {
        agentRunId,
        responseSegmentId,
        documentId,
        chunkId,
        evidenceType,
        confidenceScore,
        ...(citationId ? { citationId } : {}),
        ...(confidenceBand ? { confidenceBand } : {}),
      });

      return {
        statusCode: 201,
        payload: apiSuccess(correlationId, { citation }),
      };
    }

    if (request.method === "GET" && path === "/retrieval/citations") {
      const agentRunId = url.searchParams.get("agentRunId") ?? undefined;
      const memberContext = await buildMemberContext(request.headers, dependencies);
      const citations = await dependencies.retrievalService.listCitations(memberContext, agentRunId);

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { citations }),
      };
    }

    if (request.method === "POST" && path === "/integrations/connectors/register") {
      const body = parseJsonBody(request.body);
      const provider = requireString(body, "provider");
      const authType = parseConnectorAuthType(requireString(body, "authType"));
      const credentialReference = requireString(body, "credentialReference");
      const memberContext = await buildMemberContext(request.headers, dependencies);

      const connector = await dependencies.connectorService.registerConnector(memberContext, {
        provider,
        authType,
        credentialReference,
      });

      return {
        statusCode: 201,
        payload: apiSuccess(correlationId, { connector }),
      };
    }

    if (request.method === "GET" && path === "/integrations/connectors") {
      const workspaceId = url.searchParams.get("workspaceId");
      if (!workspaceId) {
        throw new DomainError("validation_denied", "workspaceId query param is required", {
          field: "workspaceId",
        });
      }

      const memberContext = await buildMemberContext(request.headers, dependencies, {
        workspaceId,
      });
      const connectors = await dependencies.connectorService.listByWorkspace(
        memberContext.workspaceId!,
      );

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { connectors }),
      };
    }

    if (request.method === "POST" && path === "/integrations/connectors/health") {
      const body = parseJsonBody(request.body);
      const connectorId = requireString(body, "connectorId");
      const healthStatus = parseConnectorHealthStatus(requireString(body, "healthStatus"));
      const errorMessage =
        typeof body.errorMessage === "string" ? body.errorMessage : undefined;
      const memberContext = await buildMemberContext(request.headers, dependencies);

      const connector = await dependencies.connectorService.recordHealth(
        memberContext,
        connectorId,
        healthStatus,
        errorMessage ? { errorMessage } : undefined,
      );

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { connector }),
      };
    }

    if (request.method === "POST" && path === "/integrations/connectors/revoke") {
      const body = parseJsonBody(request.body);
      const connectorId = requireString(body, "connectorId");
      const memberContext = await buildMemberContext(request.headers, dependencies);
      const connector = await dependencies.connectorService.revokeConnector(
        memberContext,
        connectorId,
      );

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { connector }),
      };
    }

    if (request.method === "POST" && path === "/automation/rules/create") {
      const body = parseJsonBody(request.body);
      const eventType = requireString(body, "eventType");
      const actionName = requireString(body, "actionName");
      const maxRetries = parseNumeric(body.maxRetries, "maxRetries", 3);
      const memberContext = await buildMemberContext(request.headers, dependencies);

      if (!Number.isInteger(maxRetries) || maxRetries < 1) {
        throw new DomainError("validation_denied", "maxRetries must be an integer >= 1", {
          field: "maxRetries",
        });
      }

      const rule = await dependencies.automationEngine.addRule({
        workspaceId: memberContext.workspaceId!,
        eventType,
        actionName,
        maxRetries,
      });

      return {
        statusCode: 201,
        payload: apiSuccess(correlationId, { rule }),
      };
    }

    if (request.method === "GET" && path === "/automation/rules") {
      const workspaceId = url.searchParams.get("workspaceId");
      if (!workspaceId) {
        throw new DomainError("validation_denied", "workspaceId query param is required", {
          field: "workspaceId",
        });
      }

      const memberContext = await buildMemberContext(request.headers, dependencies, {
        workspaceId,
      });
      const rules = await dependencies.automationEngine.listRules(memberContext.workspaceId);

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { rules }),
      };
    }

    if (request.method === "POST" && path === "/automation/events/publish") {
      const body = parseJsonBody(request.body);
      const eventType = requireString(body, "eventType");
      const sourceSystem = requireString(body, "sourceSystem");
      const payload =
        body.payload && typeof body.payload === "object"
          ? (body.payload as Record<string, unknown>)
          : {};
      const sourceEventId =
        typeof body.sourceEventId === "string" ? body.sourceEventId : undefined;
      const signatureVerified =
        typeof body.signatureVerified === "boolean" ? body.signatureVerified : true;
      const memberContext = await buildMemberContext(request.headers, dependencies);
      const eventId = typeof body.eventId === "string" ? body.eventId : `evt_${randomUUID()}`;
      const eventOptions: {
        eventId: string;
        correlationId: string;
        workspaceId?: string;
        actorId?: string;
      } = {
        eventId,
        correlationId: memberContext.correlationId,
        ...(memberContext.workspaceId ? { workspaceId: memberContext.workspaceId } : {}),
        ...(memberContext.actorId ? { actorId: memberContext.actorId } : {}),
      };

      const event = createEventEnvelope(
        eventType,
        payload,
        eventOptions,
      );

      const accepted = await dependencies.eventBus.publish(
        event,
        sourceSystem,
        sourceEventId,
        {
          signatureVerified,
        },
      );

      if (accepted) {
        await dependencies.automationEngine.process(event);
      }

      return {
        statusCode: 202,
        payload: apiSuccess(correlationId, { accepted, eventId: event.eventId }),
      };
    }

    if (request.method === "GET" && path === "/automation/events/ingestion") {
      const workspaceId = url.searchParams.get("workspaceId");
      if (!workspaceId) {
        throw new DomainError("validation_denied", "workspaceId query param is required", {
          field: "workspaceId",
        });
      }

      await buildMemberContext(request.headers, dependencies, { workspaceId });
      const records = await dependencies.eventBus.listIngestionRecords(workspaceId);

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { records }),
      };
    }

    if (request.method === "GET" && path === "/automation/runs") {
      const workspaceId = url.searchParams.get("workspaceId");
      if (!workspaceId) {
        throw new DomainError("validation_denied", "workspaceId query param is required", {
          field: "workspaceId",
        });
      }

      await buildMemberContext(request.headers, dependencies, { workspaceId });
      const runs = await dependencies.automationEngine.listRuns(workspaceId);

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { runs }),
      };
    }

    if (request.method === "POST" && path === "/notifications/preferences/update") {
      const body = parseJsonBody(request.body);
      const email = requireBoolean(body, "email");
      const inApp = requireBoolean(body, "inApp");
      const webhook = requireBoolean(body, "webhook");
      const userId = typeof body.userId === "string" ? body.userId : undefined;
      const memberContext = await buildMemberContext(request.headers, dependencies);

      const preference = await dependencies.notificationPreferenceService.upsert(memberContext, {
        channels: {
          email,
          inApp,
          webhook,
        },
        ...(userId ? { userId } : {}),
      });

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { preference }),
      };
    }

    if (request.method === "GET" && path === "/notifications/preferences") {
      const workspaceId = url.searchParams.get("workspaceId");
      if (!workspaceId) {
        throw new DomainError("validation_denied", "workspaceId query param is required", {
          field: "workspaceId",
        });
      }

      const userId = url.searchParams.get("userId") ?? undefined;
      const memberContext = await buildMemberContext(request.headers, dependencies, {
        workspaceId,
      });
      const preference = await dependencies.notificationPreferenceService.getForUser(
        memberContext,
        userId,
      );

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { preference }),
      };
    }

    if (request.method === "GET" && path === "/notifications/preferences/list") {
      const workspaceId = url.searchParams.get("workspaceId");
      if (!workspaceId) {
        throw new DomainError("validation_denied", "workspaceId query param is required", {
          field: "workspaceId",
        });
      }

      const memberContext = await buildMemberContext(request.headers, dependencies, {
        workspaceId,
      });
      if (
        !memberContext.roles.includes("owner") &&
        !memberContext.roles.includes("admin")
      ) {
        throw new DomainError("policy_denied", "Only owners/admins can list workspace preferences", {
          workspaceId,
        });
      }

      const preferences = await dependencies.notificationPreferenceService.listByWorkspace(
        workspaceId,
      );

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { preferences }),
      };
    }

    if (request.method === "POST" && path === "/webhooks/outbound/enqueue") {
      const body = parseJsonBody(request.body);
      const targetUrl = requireString(body, "targetUrl");
      const eventType = requireString(body, "eventType");
      const eventId = requireString(body, "eventId");
      const payload =
        body.payload && typeof body.payload === "object"
          ? (body.payload as Record<string, unknown>)
          : {};
      const maxAttempts =
        body.maxAttempts === undefined
          ? undefined
          : parseNumeric(body.maxAttempts, "maxAttempts", Number.NaN);
      const memberContext = await buildMemberContext(request.headers, dependencies);

      if (maxAttempts !== undefined && (!Number.isInteger(maxAttempts) || maxAttempts < 1)) {
        throw new DomainError("validation_denied", "maxAttempts must be an integer >= 1", {
          field: "maxAttempts",
        });
      }

      const delivery = await dependencies.webhookDeliveryService.enqueue(memberContext, {
        targetUrl,
        eventType,
        eventId,
        payload,
        ...(maxAttempts !== undefined ? { maxAttempts } : {}),
      });

      return {
        statusCode: 201,
        payload: apiSuccess(correlationId, { delivery }),
      };
    }

    if (request.method === "POST" && path === "/webhooks/outbound/attempt") {
      const body = parseJsonBody(request.body);
      const deliveryId = requireString(body, "deliveryId");
      const success = typeof body.success === "boolean" ? body.success : undefined;
      const errorMessage =
        typeof body.errorMessage === "string" ? body.errorMessage : undefined;
      const memberContext = await buildMemberContext(request.headers, dependencies);

      if (success === undefined) {
        throw new DomainError("validation_denied", "success is required", {
          field: "success",
        });
      }

      const delivery = await dependencies.webhookDeliveryService.recordAttempt(
        memberContext,
        deliveryId,
        {
          success,
          ...(errorMessage ? { errorMessage } : {}),
        },
      );

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { delivery }),
      };
    }

    if (request.method === "POST" && path === "/webhooks/outbound/replay") {
      const body = parseJsonBody(request.body);
      const deliveryId = requireString(body, "deliveryId");
      const memberContext = await buildMemberContext(request.headers, dependencies);
      const delivery = await dependencies.webhookDeliveryService.replay(
        memberContext,
        deliveryId,
      );

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { delivery }),
      };
    }

    if (request.method === "GET" && path === "/webhooks/outbound/list") {
      const workspaceId = url.searchParams.get("workspaceId");
      if (!workspaceId) {
        throw new DomainError("validation_denied", "workspaceId query param is required", {
          field: "workspaceId",
        });
      }

      await buildMemberContext(request.headers, dependencies, { workspaceId });
      const deliveries = await dependencies.webhookDeliveryService.listByWorkspace(
        workspaceId,
      );

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { deliveries }),
      };
    }

    if (request.method === "POST" && path === "/ai/execute") {
      const body = parseJsonBody(request.body);
      const toolName = requireString(body, "toolName");
      const toolInput = body.toolInput;
      const confirmHighRiskAction =
        typeof body.confirmHighRiskAction === "boolean"
          ? body.confirmHighRiskAction
          : undefined;
      const threadId = typeof body.threadId === "string" ? body.threadId : undefined;
      const memberContext = await buildMemberContext(request.headers, dependencies);

      await dependencies.billingService.reconcileWebhook({
        sourceEventId: `bootstrap_${memberContext.workspaceId}`,
        workspaceId: memberContext.workspaceId!,
        type: "subscription.activated",
        planId: "free",
      });

      const featureEnabled = await dependencies.billingService.checkFeature(
        memberContext.workspaceId!,
        "ai_actions",
      );
      if (!featureEnabled) {
        throw new DomainError("policy_denied", "AI actions are disabled for this workspace", {
          workspaceId: memberContext.workspaceId,
        });
      }

      const quota = await dependencies.billingService.checkQuota(
        memberContext.workspaceId!,
        "monthly_ai_actions",
      );
      if (!quota.allowed) {
        throw new DomainError("rate_limited", "AI action quota exceeded", {
          workspaceId: memberContext.workspaceId,
        });
      }

      const result = await dependencies.agentRuntimeService.execute(
        memberContext,
        {
          toolName,
          toolInput,
          ...(confirmHighRiskAction !== undefined
            ? { confirmHighRiskAction }
            : {}),
          ...(threadId ? { threadId } : {}),
        },
      );

      await dependencies.billingService.recordUsage(
        memberContext.workspaceId!,
        "monthly_ai_actions",
        1,
        { correlationId },
      );

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, result),
      };
    }

    if (request.method === "GET" && path === "/ai/runs") {
      const workspaceId = url.searchParams.get("workspaceId");
      const memberContext = await buildMemberContext(
        request.headers,
        dependencies,
        workspaceId ? { workspaceId } : undefined,
      );
      const runs = await dependencies.agentRuntimeService.listRuns(memberContext.workspaceId);
      const filtered = runs.filter((run) => run.workspaceId === memberContext.workspaceId);

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { runs: filtered }),
      };
    }

    if (request.method === "GET" && path === "/ai/tool-calls") {
      const runId = url.searchParams.get("runId");
      const memberContext = await buildMemberContext(request.headers, dependencies);
      const runsInWorkspace = (await dependencies.agentRuntimeService.listRuns(memberContext.workspaceId))
        .filter((run) => run.workspaceId === memberContext.workspaceId);
      const allowedRunIds = new Set(runsInWorkspace.map((run) => run.runId));
      const toolCalls = runId
        ? allowedRunIds.has(runId)
          ? await dependencies.agentRuntimeService.listToolCallsByRun(runId, memberContext.workspaceId)
          : []
        : (await dependencies.agentRuntimeService.listToolCalls(memberContext.workspaceId))
            .filter((call) => allowedRunIds.has(call.runId));

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { toolCalls }),
      };
    }

    if (request.method === "POST" && path === "/billing/reconcile") {
      const body = parseJsonBody(request.body);
      const sourceEventId = requireString(body, "sourceEventId");
      const workspaceId = requireString(body, "workspaceId");
      const type = requireString(body, "type") as
        | "subscription.activated"
        | "subscription.changed"
        | "subscription.canceled"
        | "invoice.payment_failed";
      const planId = typeof body.planId === "string" ? body.planId : undefined;

      const reconcileInput: {
        sourceEventId: string;
        workspaceId: string;
        type:
          | "subscription.activated"
          | "subscription.changed"
          | "subscription.canceled"
          | "invoice.payment_failed";
        planId?: string;
      } = {
        sourceEventId,
        workspaceId,
        type,
        ...(planId ? { planId } : {}),
      };

      await buildMemberContext(request.headers, dependencies, { workspaceId });
      const subscription = dependencies.billingService.reconcileWebhook(reconcileInput);

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { subscription }),
      };
    }

    if (request.method === "POST" && path === "/billing/policies") {
      const body = parseJsonBody(request.body);
      const planId = requireString(body, "planId");
      const features = body.features;
      const quotas = body.quotas;

      if (!features || typeof features !== "object" || !quotas || typeof quotas !== "object") {
        throw new DomainError("validation_denied", "features and quotas are required objects", {
          field: "features,quotas",
        });
      }

      dependencies.billingService.setEntitlementPolicy({
        planId,
        features: features as Record<string, boolean>,
        quotas: quotas as Record<string, number>,
      });

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { policySaved: true }),
      };
    }

    if (request.method === "POST" && path === "/billing/usage") {
      const body = parseJsonBody(request.body);
      const workspaceId = requireString(body, "workspaceId");
      const metric = requireString(body, "metric");
      const amount = parseNumeric(body.amount, "amount", 1);

      await buildMemberContext(request.headers, dependencies, { workspaceId });

      dependencies.billingService.recordUsage(workspaceId, metric, amount);
      const quota = dependencies.billingService.checkQuota(workspaceId, metric);

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { quota }),
      };
    }

    if (request.method === "GET" && path === "/billing/quota") {
      const workspaceId = url.searchParams.get("workspaceId");
      const metric = url.searchParams.get("metric");

      if (!workspaceId || !metric) {
        throw new DomainError("validation_denied", "workspaceId and metric query params are required", {
          field: "workspaceId,metric",
        });
      }

      await buildMemberContext(request.headers, dependencies, { workspaceId });
      const quota = dependencies.billingService.checkQuota(workspaceId, metric);
      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { quota }),
      };
    }

    if (request.method === "GET" && path === "/billing/feature") {
      const workspaceId = url.searchParams.get("workspaceId");
      const feature = url.searchParams.get("feature");

      if (!workspaceId || !feature) {
        throw new DomainError("validation_denied", "workspaceId and feature query params are required", {
          field: "workspaceId,feature",
        });
      }

      await buildMemberContext(request.headers, dependencies, { workspaceId });
      const enabled = dependencies.billingService.checkFeature(workspaceId, feature);
      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { enabled }),
      };
    }

    if (request.method === "POST" && path === "/billing/analytics-events") {
      const body = parseJsonBody(request.body);
      const workspaceId = requireString(body, "workspaceId");
      const eventName = requireString(body, "eventName");
      const eventVersion = requireString(body, "eventVersion");
      const payloadValidationStatus =
        typeof body.payloadValidationStatus === "string"
          ? parseAnalyticsPayloadValidationStatus(body.payloadValidationStatus)
          : "valid";
      const planId = typeof body.planId === "string" ? body.planId : undefined;
      const occurredAt = typeof body.occurredAt === "string" ? body.occurredAt : undefined;
      const idempotencyKey =
        typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined;
      const payload =
        body.payload && typeof body.payload === "object"
          ? (body.payload as Record<string, unknown>)
          : undefined;

      const entitlementSnapshotRaw = body.entitlementSnapshot;
      if (!entitlementSnapshotRaw || typeof entitlementSnapshotRaw !== "object") {
        throw new DomainError(
          "validation_denied",
          "entitlementSnapshot object is required",
          {
            field: "entitlementSnapshot",
          },
        );
      }

      const entitlementSnapshotBody = entitlementSnapshotRaw as Record<string, unknown>;
      const featureKey = requireString(entitlementSnapshotBody, "featureKey");
      const entitlementStatus = parseEntitlementStatus(
        requireString(entitlementSnapshotBody, "entitlementStatus"),
      );
      const quotaKey =
        typeof entitlementSnapshotBody.quotaKey === "string"
          ? entitlementSnapshotBody.quotaKey
          : undefined;
      const consumedUnits =
        entitlementSnapshotBody.consumedUnits === undefined
          ? undefined
          : parseNumeric(entitlementSnapshotBody.consumedUnits, "consumedUnits", Number.NaN);
      const limitUnits =
        entitlementSnapshotBody.limitUnits === undefined
          ? undefined
          : parseNumeric(entitlementSnapshotBody.limitUnits, "limitUnits", Number.NaN);
      const counterVersion =
        entitlementSnapshotBody.counterVersion === undefined
          ? undefined
          : parseNumeric(entitlementSnapshotBody.counterVersion, "counterVersion", Number.NaN);

      if (consumedUnits !== undefined && Number.isNaN(consumedUnits)) {
        throw new DomainError("validation_denied", "consumedUnits is required when provided", {
          field: "entitlementSnapshot.consumedUnits",
        });
      }

      if (limitUnits !== undefined && Number.isNaN(limitUnits)) {
        throw new DomainError("validation_denied", "limitUnits is required when provided", {
          field: "entitlementSnapshot.limitUnits",
        });
      }

      if (counterVersion !== undefined && Number.isNaN(counterVersion)) {
        throw new DomainError("validation_denied", "counterVersion is required when provided", {
          field: "entitlementSnapshot.counterVersion",
        });
      }

      const memberContext = await buildMemberContext(request.headers, dependencies, {
        workspaceId,
      });
      const event = dependencies.billingService.recordAnalyticsEvent({
        workspaceId,
        eventName,
        eventVersion,
        correlationId,
        payloadValidationStatus,
        entitlementSnapshot: {
          featureKey,
          entitlementStatus,
          ...(quotaKey ? { quotaKey } : {}),
          ...(consumedUnits !== undefined ? { consumedUnits } : {}),
          ...(limitUnits !== undefined ? { limitUnits } : {}),
          ...(counterVersion !== undefined ? { counterVersion } : {}),
        },
        ...(planId ? { planId } : {}),
        ...(occurredAt ? { occurredAt } : {}),
        ...(idempotencyKey ? { idempotencyKey } : {}),
        ...(payload ? { payload } : {}),
        ...(memberContext.actorId ? { actorId: memberContext.actorId } : {}),
      });

      return {
        statusCode: 201,
        payload: apiSuccess(correlationId, { event }),
      };
    }

    if (request.method === "GET" && path === "/billing/analytics-events") {
      const workspaceId = url.searchParams.get("workspaceId");

      if (!workspaceId) {
        throw new DomainError("validation_denied", "workspaceId query param is required", {
          field: "workspaceId",
        });
      }

      await buildMemberContext(request.headers, dependencies, { workspaceId });
      const events = dependencies.billingService.listAnalyticsEvents(workspaceId);
      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { events }),
      };
    }

    if (request.method === "GET" && path === "/billing/integrity-anomalies") {
      const workspaceId = url.searchParams.get("workspaceId");

      if (!workspaceId) {
        throw new DomainError("validation_denied", "workspaceId query param is required", {
          field: "workspaceId",
        });
      }

      await buildMemberContext(request.headers, dependencies, { workspaceId });
      const anomalies = dependencies.billingService.listIntegrityAnomalies(workspaceId);
      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { anomalies }),
      };
    }

    if (request.method === "POST" && path === "/release/evidence") {
      const body = parseJsonBody(request.body);
      const gate = parseReleaseGate(requireString(body, "gate"));
      const notes = typeof body.notes === "string" ? body.notes : undefined;

      const evidenceInput = {
        testsPassed: Boolean(body.testsPassed),
        observabilityVerified: Boolean(body.observabilityVerified),
        rollbackVerified: Boolean(body.rollbackVerified),
        docsUpdated: Boolean(body.docsUpdated),
        ...(notes ? { notes } : {}),
      };

      dependencies.releaseReadinessService.record(gate, evidenceInput);

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { stored: true, gate }),
      };
    }

    if (request.method === "POST" && path === "/release/authz-regression") {
      const body = parseJsonBody(request.body);
      const gate = parseReleaseGate(requireString(body, "gate"));
      const passed = requireBoolean(body, "passed");
      const totalTests = parseRequiredInteger(body, "totalTests");
      const passedTests = parseRequiredInteger(body, "passedTests");
      const failedTests = parseRequiredInteger(body, "failedTests");
      const runId = typeof body.runId === "string" ? body.runId : undefined;
      const suiteId = typeof body.suiteId === "string" ? body.suiteId : undefined;
      const startedAt = typeof body.startedAt === "string" ? body.startedAt : undefined;
      const completedAt = typeof body.completedAt === "string" ? body.completedAt : undefined;
      const ciRunUrl = typeof body.ciRunUrl === "string" ? body.ciRunUrl : undefined;
      const reportUrl = typeof body.reportUrl === "string" ? body.reportUrl : undefined;
      const notes = typeof body.notes === "string" ? body.notes : undefined;

      if (passedTests + failedTests > totalTests) {
        throw new DomainError(
          "validation_denied",
          "passedTests + failedTests must be <= totalTests",
          {
            field: "totalTests,passedTests,failedTests",
          },
        );
      }

      const regression = dependencies.releaseReadinessService.recordAuthzRegression(gate, {
        passed,
        totalTests,
        passedTests,
        failedTests,
        ...(runId ? { runId } : {}),
        ...(suiteId ? { suiteId } : {}),
        ...(startedAt ? { startedAt } : {}),
        ...(completedAt ? { completedAt } : {}),
        ...(ciRunUrl ? { ciRunUrl } : {}),
        ...(reportUrl ? { reportUrl } : {}),
        ...(notes ? { notes } : {}),
      });

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { stored: true, gate, regression }),
      };
    }

    if (request.method === "GET" && path === "/release/evaluate") {
      const gateRaw = url.searchParams.get("gate");

      if (!gateRaw) {
        throw new DomainError("validation_denied", "gate query param is required", {
          field: "gate",
        });
      }

      const gate = parseReleaseGate(gateRaw);
      const evaluation = dependencies.releaseReadinessService.evaluate(gate);

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, { gate, evaluation }),
      };
    }

    if (request.method === "GET" && path === "/release/dashboard") {
      const gateRaw = url.searchParams.get("gate");

      if (!gateRaw) {
        throw new DomainError("validation_denied", "gate query param is required", {
          field: "gate",
        });
      }

      const gate = parseReleaseGate(gateRaw);
      const dashboard = dependencies.releaseReadinessService.evaluateDashboard(gate);
      const latestAuthzRegression =
        dependencies.releaseReadinessService.latestAuthzRegression(gate) ?? null;

      return {
        statusCode: 200,
        payload: apiSuccess(correlationId, {
          gate,
          dashboard,
          latestAuthzRegression,
        }),
      };
    }

    return {
      statusCode: 404,
      payload: apiError(correlationId, "not_found", "Route not found", {
        path,
      }),
    };
  } catch (error: unknown) {
    if (error instanceof DomainError) {
      return {
        statusCode: mapErrorToStatus(error),
        payload: apiError(correlationId, error.code, error.message, error.details),
      };
    }

    return {
      statusCode: 500,
      payload: apiError(correlationId, "internal_error", "Unexpected error", {
        reason: "unhandled_exception",
      }),
    };
  }
}

