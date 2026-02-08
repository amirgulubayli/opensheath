export type SchemaVersion = `v${number}`;

export const CONTRACTS_VERSION: SchemaVersion = "v1";

export interface EventEnvelope<TType extends string, TPayload> {
  eventId: string;
  eventType: TType;
  occurredAt: string;
  version: SchemaVersion;
  correlationId: string;
  workspaceId?: string;
  actorId?: string;
  payload: TPayload;
}

export type ApiErrorCode =
  | "validation_denied"
  | "auth_denied"
  | "policy_denied"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "unavailable"
  | "internal_error";

export interface ApiError {
  ok: false;
  code: ApiErrorCode;
  message: string;
  correlationId: string;
  details?: Record<string, string | number | boolean | null>;
}

export interface ApiSuccess<TData> {
  ok: true;
  data: TData;
  correlationId: string;
}

export type ApiResponse<TData> = ApiSuccess<TData> | ApiError;

export type ProjectStatus = "draft" | "active" | "archived";

export interface ProjectRecord {
  projectId: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectEventType = "project.created" | "project.updated" | "project.archived";

export interface ProjectEventPayload {
  projectId: string;
  workspaceId: string;
  status: ProjectStatus;
}

export type ProjectEvent = EventEnvelope<ProjectEventType, ProjectEventPayload>;

export type IngestionStatus =
  | "queued"
  | "processing"
  | "retrying"
  | "failed"
  | "completed"
  | "dead_letter";

export interface DocumentAsset {
  documentId: string;
  workspaceId: string;
  name: string;
  source: string;
  status: IngestionStatus;
  createdAt: string;
  updatedAt: string;
}

export type DocumentEventType =
  | "document.created"
  | "document.processing"
  | "document.retrying"
  | "document.failed"
  | "document.completed"
  | "document.dead_letter";

export interface DocumentEventPayload {
  documentId: string;
  workspaceId: string;
  status: IngestionStatus;
}

export type DocumentEvent = EventEnvelope<DocumentEventType, DocumentEventPayload>;

export interface HealthResponse {
  service: "api";
  status: "ok";
  version: SchemaVersion;
  now: string;
}

export type AlertSeverity = "p1" | "p2";

export interface AuthAlertThresholds {
  minAuthRequestCount: number;
  p1AuthFailureRate: number;
  p2UnauthorizedAttemptCount: number;
}

export type AuthAlertCode = "auth_failure_rate_high" | "unauthorized_attempt_spike";

export interface AuthAlert {
  code: AuthAlertCode;
  severity: AlertSeverity;
  value: number;
  threshold: number;
  message: string;
  runbook: string;
}

export interface AuthTotalsSnapshot {
  requestCount: number;
  failureCount: number;
  unauthorizedAttemptCount: number;
}

export interface AuthAlertEvaluation {
  generatedAt: string;
  thresholds: AuthAlertThresholds;
  authTotals: AuthTotalsSnapshot;
  alerts: AuthAlert[];
}

export type ToolRiskClass = "low" | "medium" | "high";

export type AgentRunStatus =
  | "queued"
  | "running"
  | "waiting_tool"
  | "retrying"
  | "failed"
  | "blocked_policy"
  | "completed"
  | "escalated_human";

export type ToolCallStatus =
  | "requested"
  | "authorized"
  | "executing"
  | "retrying"
  | "failed"
  | "blocked_policy"
  | "succeeded"
  | "canceled";

export type AiPolicyDecision = "authorized" | "blocked_policy";

export type AiErrorClass =
  | "timeout"
  | "validation_error"
  | "authz_denied"
  | "policy_denied"
  | "provider_error"
  | "dependency_unavailable"
  | "unexpected_internal";

export type ModerationOutcome = "not_run" | "allowed" | "blocked" | "flagged";

export interface AgentRunRecord {
  runId: string;
  workspaceId: string;
  threadId?: string;
  actorId?: string;
  correlationId: string;
  modelName: string;
  modelVersion: string;
  promptVersion: string;
  status: AgentRunStatus;
  startedAt: string;
  completedAt?: string;
  errorClass?: AiErrorClass;
  moderationOutcome?: ModerationOutcome;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export interface ToolCallRecord {
  toolCallId: string;
  runId: string;
  workspaceId: string;
  actorId?: string;
  correlationId: string;
  toolName: string;
  toolVersion: string;
  stepIndex: number;
  idempotencyKey: string;
  policyDecision: AiPolicyDecision;
  status: ToolCallStatus;
  attemptCount: number;
  startedAt: string;
  completedAt?: string;
  errorClass?: AiErrorClass;
}

const AGENT_RUN_TRANSITIONS: Record<AgentRunStatus, readonly AgentRunStatus[]> = {
  queued: ["running"],
  running: ["waiting_tool", "completed", "failed", "blocked_policy", "escalated_human"],
  waiting_tool: ["running", "retrying", "failed"],
  retrying: ["running", "failed", "escalated_human"],
  failed: [],
  blocked_policy: [],
  completed: [],
  escalated_human: [],
};

const TOOL_CALL_TRANSITIONS: Record<ToolCallStatus, readonly ToolCallStatus[]> = {
  requested: ["authorized", "blocked_policy"],
  authorized: ["executing", "canceled"],
  executing: ["succeeded", "retrying", "failed"],
  retrying: ["executing", "failed"],
  failed: [],
  blocked_policy: [],
  succeeded: [],
  canceled: [],
};

export function isValidAgentRunTransition(
  from: AgentRunStatus,
  to: AgentRunStatus,
): boolean {
  return AGENT_RUN_TRANSITIONS[from].includes(to);
}

export function isValidToolCallTransition(
  from: ToolCallStatus,
  to: ToolCallStatus,
): boolean {
  return TOOL_CALL_TRANSITIONS[from].includes(to);
}

export type RetrievalMethod = "semantic" | "keyword" | "hybrid";
export type EvidenceType = "direct" | "supporting" | "inferred";
export type ConfidenceBand = "high" | "medium" | "low";

export interface RetrievalResultItem {
  workspaceId: string;
  documentId: string;
  chunkId: string;
  sourceUri: string;
  sourceTitle: string;
  chunkStartOffset: number;
  chunkEndOffset: number;
  retrievalScore: number;
  retrievalRank: number;
  retrievalMethod: RetrievalMethod;
  embeddingModelVersion: string;
  indexedAt: string;
  correlationId: string;
}

export interface CitationProvenance {
  citationId: string;
  agentRunId: string;
  responseSegmentId: string;
  documentId: string;
  chunkId: string;
  evidenceType: EvidenceType;
  confidenceScore: number;
  confidenceBand: ConfidenceBand;
  workspaceId: string;
}

export type EventIngestionStatus = "accepted" | "duplicate" | "rejected_signature";

export interface EventIngestionRecord {
  sourceSystem: string;
  sourceEventId: string;
  eventType: string;
  eventId: string;
  signatureVerified: boolean;
  receivedAt: string;
  ingestionStatus: EventIngestionStatus;
  correlationId: string;
  workspaceId?: string;
}

export type ConnectorAuthType = "oauth" | "api_key";
export type ConnectorStatus = "connected" | "degraded" | "revoked";
export type ConnectorHealthStatus = "healthy" | "degraded" | "unreachable";

export interface ConnectorRecord {
  connectorId: string;
  workspaceId: string;
  provider: string;
  authType: ConnectorAuthType;
  credentialReference: string;
  status: ConnectorStatus;
  createdAt: string;
  updatedAt: string;
  lastHealthStatus?: ConnectorHealthStatus;
  lastHealthCheckAt?: string;
  lastErrorMessage?: string;
  revokedAt?: string;
}

export interface AutomationRule {
  ruleId: string;
  workspaceId: string;
  eventType: string;
  actionName: string;
  maxRetries: number;
}

export interface AutomationRun {
  runId: string;
  workspaceId: string;
  ruleId: string;
  eventId: string;
  idempotencyKey: string;
  status: "completed" | "dead_letter";
  attempts: number;
  startedAt: string;
  completedAt: string;
  lastError?: string;
}

export type OutboundWebhookDeliveryStatus =
  | "pending"
  | "delivered"
  | "failed"
  | "dead_letter";

export interface OutboundWebhookDeliveryRecord {
  deliveryId: string;
  workspaceId: string;
  targetUrl: string;
  eventType: string;
  eventId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  attemptCount: number;
  maxAttempts: number;
  status: OutboundWebhookDeliveryStatus;
  queuedAt: string;
  updatedAt: string;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  completedAt?: string;
  lastErrorMessage?: string;
}

export type EntitlementStatus = "enabled" | "disabled" | "grace";

export type AnalyticsPayloadValidationStatus =
  | "valid"
  | "missing_required_fields"
  | "invalid_schema";

export interface EntitlementSnapshot {
  featureKey: string;
  entitlementStatus: EntitlementStatus;
  quotaKey?: string;
  consumedUnits?: number;
  limitUnits?: number;
  counterVersion?: number;
}

export interface AnalyticsEventRecord {
  analyticsEventId: string;
  workspaceId: string;
  eventName: string;
  eventVersion: string;
  occurredAt: string;
  actorId?: string;
  correlationId: string;
  planId: string;
  entitlementSnapshot: EntitlementSnapshot;
  payloadValidationStatus: AnalyticsPayloadValidationStatus;
}

export interface EntitlementIntegrityAnomaly {
  anomalyId: string;
  workspaceId: string;
  eventName: string;
  expectedPlanId: string;
  observedPlanId: string;
  correlationId: string;
  detectedAt: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  workspaceId?: string;
}

export type OAuthProvider = "google" | "github" | "microsoft";

export interface OAuthExchangeRequest {
  provider: OAuthProvider;
  authorizationCode: string;
  state: string;
  email: string;
  providerAccountId: string;
  workspaceId?: string;
}

export interface SessionDto {
  sessionId: string;
  userId: string;
  workspaceId: string;
  expiresAt: string;
}

export interface SignInResponse {
  session: SessionDto;
}

export interface SessionRefreshResponse {
  session: SessionDto;
  rotatedFromSessionId: string;
}

export interface OAuthExchangeResponse {
  session: SessionDto;
  provider: OAuthProvider;
  linkStatus: "linked_existing" | "created_new";
}

export interface NotificationChannelPreferences {
  email: boolean;
  inApp: boolean;
  webhook: boolean;
}

export interface NotificationPreferenceRecord {
  preferenceId: string;
  workspaceId: string;
  userId: string;
  channels: NotificationChannelPreferences;
  createdAt: string;
  updatedAt: string;
}

export type ReleaseGate =
  | "architecture"
  | "ci_cd"
  | "auth_shell"
  | "tenant_isolation"
  | "core_workflow"
  | "discoverability"
  | "ai_action"
  | "ai_quality"
  | "automation"
  | "billing_sync"
  | "beta_readiness"
  | "ga_launch";

export interface ReleaseGateEvidenceInput {
  testsPassed: boolean;
  observabilityVerified: boolean;
  rollbackVerified: boolean;
  docsUpdated: boolean;
  notes?: string;
}

export interface AuthzRegressionRun {
  runId: string;
  suiteId: string;
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  startedAt: string;
  completedAt: string;
  ciRunUrl?: string;
  reportUrl?: string;
  notes?: string;
}

export interface ReleaseGateDashboardCheckStatus {
  required: boolean;
  present: boolean;
  passed: boolean;
  runId?: string;
  completedAt?: string;
  failedTests?: number;
}

export interface ReleaseGateDashboard {
  gate: ReleaseGate;
  ready: boolean;
  missing: string[];
  checks: {
    evidence: {
      testsPassed: boolean;
      observabilityVerified: boolean;
      rollbackVerified: boolean;
      docsUpdated: boolean;
    };
    authzRegression: ReleaseGateDashboardCheckStatus;
  };
}

export type AppRouteId =
  | "home"
  | "sign_in"
  | "dashboard"
  | "workspaces"
  | "ai"
  | "retrieval"
  | "analytics"
  | "automation"
  | "integrations"
  | "notifications"
  | "webhooks"
  | "openclaw"
  | "settings"
  | "not_found";

export interface AppShellRoute {
  id: AppRouteId;
  path: string;
  title: string;
  requiresAuth: boolean;
  featureFlag?: string;
}

export type UiSurfaceStatus = "loading" | "ready" | "error";

export interface UiSurfaceState {
  status: UiSurfaceStatus;
  message?: string;
  retryable?: boolean;
}

export interface ErrorDetailsInput {
  [key: string]: string | number | boolean | null;
}

export function createEventEnvelope<TType extends string, TPayload>(
  eventType: TType,
  payload: TPayload,
  options: {
    eventId: string;
    correlationId: string;
    occurredAt?: string;
    workspaceId?: string;
    actorId?: string;
    version?: SchemaVersion;
  },
): EventEnvelope<TType, TPayload> {
  const envelope: EventEnvelope<TType, TPayload> = {
    eventId: options.eventId,
    eventType,
    occurredAt: options.occurredAt ?? new Date().toISOString(),
    correlationId: options.correlationId,
    version: options.version ?? CONTRACTS_VERSION,
    payload,
  };

  if (options.workspaceId !== undefined) {
    envelope.workspaceId = options.workspaceId;
  }

  if (options.actorId !== undefined) {
    envelope.actorId = options.actorId;
  }

  return envelope;
}

export function apiSuccess<TData>(
  correlationId: string,
  data: TData,
): ApiSuccess<TData> {
  return {
    ok: true,
    data,
    correlationId,
  };
}

export function apiError(
  correlationId: string,
  code: ApiErrorCode,
  message: string,
  details?: ErrorDetailsInput,
): ApiError {
  const failure: ApiError = {
    ok: false,
    code,
    message,
    correlationId,
  };

  if (details !== undefined) {
    failure.details = details;
  }

  return failure;
}

export * from "./openclaw.js";

export function normalizeAppPath(path: string): string {
  const trimmed = path.trim();

  if (trimmed === "" || trimmed === "/") {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "");
}
