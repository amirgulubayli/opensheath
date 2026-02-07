import type {
  ApiResponse,
  AgentRunRecord,
  AnalyticsEventRecord,
  AutomationRule,
  AutomationRun,
  ConnectorRecord,
  DocumentAsset,
  EntitlementIntegrityAnomaly,
  EventIngestionRecord,
  NotificationPreferenceRecord,
  OutboundWebhookDeliveryRecord,
  ProjectRecord,
  RetrievalResultItem,
  ToolCallRecord,
  SignInResponse,
} from "@ethoxford/contracts";

const DEFAULT_BASE_URL = "http://localhost:3001";

export function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
}

async function request<T>(
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    sessionId?: string;
  },
): Promise<ApiResponse<T>> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(options?.sessionId ? { "x-session-id": options.sessionId } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const payload = (await response.json()) as ApiResponse<T>;
  return payload;
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<ApiResponse<SignInResponse>> {
  return request<SignInResponse>("/auth/sign-in", {
    method: "POST",
    body: input,
  });
}

export async function listProjects(input: {
  workspaceId: string;
  sessionId: string;
}): Promise<ApiResponse<{ projects: ProjectRecord[] }>> {
  const params = new URLSearchParams({ workspaceId: input.workspaceId });
  return request<{ projects: ProjectRecord[] }>(`/projects/list?${params.toString()}`, {
    sessionId: input.sessionId,
  });
}

export async function listDocuments(input: {
  workspaceId: string;
  sessionId: string;
}): Promise<ApiResponse<{ documents: DocumentAsset[] }>> {
  const params = new URLSearchParams({ workspaceId: input.workspaceId });
  return request<{ documents: DocumentAsset[] }>(`/documents/list?${params.toString()}`, {
    sessionId: input.sessionId,
  });
}

export async function createProject(input: {
  sessionId: string;
  name: string;
  description?: string;
}): Promise<ApiResponse<{ project: ProjectRecord }>> {
  return request<{ project: ProjectRecord }>("/projects/create", {
    method: "POST",
    sessionId: input.sessionId,
    body: {
      name: input.name,
      ...(input.description ? { description: input.description } : {}),
    },
  });
}

export async function createDocument(input: {
  sessionId: string;
  name: string;
  source: string;
}): Promise<ApiResponse<{ document: DocumentAsset }>> {
  return request<{ document: DocumentAsset }>("/documents/create", {
    method: "POST",
    sessionId: input.sessionId,
    body: {
      name: input.name,
      source: input.source,
    },
  });
}

export async function createWorkspace(input: {
  sessionId: string;
  ownerUserId: string;
  name: string;
}): Promise<ApiResponse<{ workspace: { workspaceId: string; name: string; ownerUserId: string } }>> {
  return request<{ workspace: { workspaceId: string; name: string; ownerUserId: string } }>(
    "/workspaces/create",
    {
      method: "POST",
      sessionId: input.sessionId,
      body: {
        ownerUserId: input.ownerUserId,
        name: input.name,
      },
    },
  );
}

export async function inviteWorkspaceMember(input: {
  sessionId: string;
  workspaceId: string;
  email: string;
  role: string;
}): Promise<ApiResponse<{ inviteToken: string }>> {
  return request<{ inviteToken: string }>("/workspaces/invite", {
    method: "POST",
    sessionId: input.sessionId,
    body: {
      workspaceId: input.workspaceId,
      email: input.email,
      role: input.role,
    },
  });
}

export async function acceptWorkspaceInvite(input: {
  sessionId: string;
  inviteToken: string;
  userId: string;
}): Promise<ApiResponse<{ membership: { workspaceId: string; userId: string; role: string } }>> {
  return request<{ membership: { workspaceId: string; userId: string; role: string } }>(
    "/workspaces/accept-invite",
    {
      method: "POST",
      sessionId: input.sessionId,
      body: {
        inviteToken: input.inviteToken,
        userId: input.userId,
      },
    },
  );
}

export async function listWorkspaceMembers(input: {
  sessionId: string;
  workspaceId: string;
}): Promise<ApiResponse<{ members: Array<{ workspaceId: string; userId: string; role: string }> }>> {
  const params = new URLSearchParams({ workspaceId: input.workspaceId });
  return request<{ members: Array<{ workspaceId: string; userId: string; role: string }> }>(
    `/workspaces/members?${params.toString()}`,
    { sessionId: input.sessionId },
  );
}

export async function updateWorkspaceMemberRole(input: {
  sessionId: string;
  workspaceId: string;
  targetUserId: string;
  role: string;
}): Promise<ApiResponse<{ membership: { workspaceId: string; userId: string; role: string } }>> {
  return request<{ membership: { workspaceId: string; userId: string; role: string } }>(
    "/workspaces/members/update-role",
    {
      method: "POST",
      sessionId: input.sessionId,
      body: {
        workspaceId: input.workspaceId,
        targetUserId: input.targetUserId,
        role: input.role,
      },
    },
  );
}

export async function removeWorkspaceMember(input: {
  sessionId: string;
  workspaceId: string;
  targetUserId: string;
}): Promise<ApiResponse<{ removed: boolean }>> {
  return request<{ removed: boolean }>("/workspaces/members/remove", {
    method: "POST",
    sessionId: input.sessionId,
    body: {
      workspaceId: input.workspaceId,
      targetUserId: input.targetUserId,
    },
  });
}

export async function listAnalyticsEvents(input: {
  sessionId: string;
  workspaceId: string;
}): Promise<ApiResponse<{ events: AnalyticsEventRecord[] }>> {
  const params = new URLSearchParams({ workspaceId: input.workspaceId });
  return request<{ events: AnalyticsEventRecord[] }>(
    `/billing/analytics-events?${params.toString()}`,
    { sessionId: input.sessionId },
  );
}

export async function listIntegrityAnomalies(input: {
  sessionId: string;
  workspaceId: string;
}): Promise<ApiResponse<{ anomalies: EntitlementIntegrityAnomaly[] }>> {
  const params = new URLSearchParams({ workspaceId: input.workspaceId });
  return request<{ anomalies: EntitlementIntegrityAnomaly[] }>(
    `/billing/integrity-anomalies?${params.toString()}`,
    { sessionId: input.sessionId },
  );
}

export async function getUsageQuota(input: {
  sessionId: string;
  workspaceId: string;
  metric: string;
}): Promise<ApiResponse<{ quota: { allowed: boolean; remaining: number } }>> {
  const params = new URLSearchParams({ workspaceId: input.workspaceId, metric: input.metric });
  return request<{ quota: { allowed: boolean; remaining: number } }>(
    `/billing/quota?${params.toString()}`,
    { sessionId: input.sessionId },
  );
}

export async function uploadDocument(input: {
  sessionId: string;
  name: string;
  source: string;
  content: string;
  embeddingModelVersion?: string;
  chunkSize?: number;
  overlap?: number;
}): Promise<ApiResponse<{ document: DocumentAsset; chunkCount: number }>> {
  return request<{ document: DocumentAsset; chunkCount: number }>("/documents/upload", {
    method: "POST",
    sessionId: input.sessionId,
    body: {
      name: input.name,
      source: input.source,
      content: input.content,
      ...(input.embeddingModelVersion
        ? { embeddingModelVersion: input.embeddingModelVersion }
        : {}),
      ...(input.chunkSize !== undefined ? { chunkSize: input.chunkSize } : {}),
      ...(input.overlap !== undefined ? { overlap: input.overlap } : {}),
    },
  });
}

export async function retryDocumentIngestion(input: {
  sessionId: string;
  documentId: string;
  replayDeadLetter?: boolean;
}): Promise<ApiResponse<{ document: DocumentAsset }>> {
  return request<{ document: DocumentAsset }>("/documents/retry", {
    method: "POST",
    sessionId: input.sessionId,
    body: {
      documentId: input.documentId,
      ...(input.replayDeadLetter ? { replayDeadLetter: true } : {}),
    },
  });
}

export async function retrievalQuery(input: {
  sessionId: string;
  query: string;
  method?: string;
}): Promise<ApiResponse<{ results: RetrievalResultItem[] }>> {
  return request<{ results: RetrievalResultItem[] }>("/retrieval/query", {
    method: "POST",
    sessionId: input.sessionId,
    body: {
      query: input.query,
      ...(input.method ? { method: input.method } : {}),
    },
  });
}

export async function indexRetrievalChunk(input: {
  sessionId: string;
  documentId: string;
  sourceUri: string;
  sourceTitle: string;
  embeddingModelVersion: string;
  content: string;
}): Promise<ApiResponse<{ indexed: RetrievalResultItem[] }>> {
  return request<{ indexed: RetrievalResultItem[] }>("/retrieval/index-chunks", {
    method: "POST",
    sessionId: input.sessionId,
    body: {
      documentId: input.documentId,
      sourceUri: input.sourceUri,
      sourceTitle: input.sourceTitle,
      embeddingModelVersion: input.embeddingModelVersion,
      chunks: [
        {
          text: input.content,
          chunkStartOffset: 0,
          chunkEndOffset: Math.max(0, input.content.length - 1),
        },
      ],
    },
  });
}

export async function aiExecute(input: {
  sessionId: string;
  toolName: string;
  toolInput: unknown;
  confirmHighRiskAction?: boolean;
}): Promise<ApiResponse<unknown>> {
  return request<unknown>("/ai/execute", {
    method: "POST",
    sessionId: input.sessionId,
    body: {
      toolName: input.toolName,
      toolInput: input.toolInput,
      ...(input.confirmHighRiskAction ? { confirmHighRiskAction: true } : {}),
    },
  });
}

export async function listAiRuns(input: {
  sessionId: string;
  workspaceId: string;
}): Promise<ApiResponse<{ runs: AgentRunRecord[] }>> {
  const params = new URLSearchParams({ workspaceId: input.workspaceId });
  return request<{ runs: AgentRunRecord[] }>(`/ai/runs?${params.toString()}`, {
    sessionId: input.sessionId,
  });
}

export async function listAiToolCalls(input: {
  sessionId: string;
  workspaceId: string;
}): Promise<ApiResponse<{ toolCalls: ToolCallRecord[] }>> {
  const params = new URLSearchParams({ workspaceId: input.workspaceId });
  return request<{ toolCalls: ToolCallRecord[] }>(
    `/ai/tool-calls?${params.toString()}`,
    {
      sessionId: input.sessionId,
    },
  );
}

export async function registerConnector(input: {
  sessionId: string;
  provider: string;
  authType: "oauth" | "api_key";
  credentialReference: string;
}): Promise<ApiResponse<{ connector: ConnectorRecord }>> {
  return request<{ connector: ConnectorRecord }>("/integrations/connectors/register", {
    method: "POST",
    sessionId: input.sessionId,
    body: {
      provider: input.provider,
      authType: input.authType,
      credentialReference: input.credentialReference,
    },
  });
}

export async function listConnectors(input: {
  sessionId: string;
  workspaceId: string;
}): Promise<ApiResponse<{ connectors: ConnectorRecord[] }>> {
  const params = new URLSearchParams({ workspaceId: input.workspaceId });
  return request<{ connectors: ConnectorRecord[] }>(
    `/integrations/connectors?${params.toString()}`,
    {
      sessionId: input.sessionId,
    },
  );
}

export async function createAutomationRule(input: {
  sessionId: string;
  eventType: string;
  actionName: string;
  maxRetries: number;
}): Promise<ApiResponse<{ rule: AutomationRule }>> {
  return request<{ rule: AutomationRule }>("/automation/rules/create", {
    method: "POST",
    sessionId: input.sessionId,
    body: {
      eventType: input.eventType,
      actionName: input.actionName,
      maxRetries: input.maxRetries,
    },
  });
}

export async function listAutomationRules(input: {
  sessionId: string;
  workspaceId: string;
}): Promise<ApiResponse<{ rules: AutomationRule[] }>> {
  const params = new URLSearchParams({ workspaceId: input.workspaceId });
  return request<{ rules: AutomationRule[] }>(`/automation/rules?${params.toString()}`, {
    sessionId: input.sessionId,
  });
}

export async function listAutomationRuns(input: {
  sessionId: string;
  workspaceId: string;
}): Promise<ApiResponse<{ runs: AutomationRun[] }>> {
  const params = new URLSearchParams({ workspaceId: input.workspaceId });
  return request<{ runs: AutomationRun[] }>(`/automation/runs?${params.toString()}`, {
    sessionId: input.sessionId,
  });
}

export async function listEventIngestion(input: {
  sessionId: string;
  workspaceId: string;
}): Promise<ApiResponse<{ records: EventIngestionRecord[] }>> {
  const params = new URLSearchParams({ workspaceId: input.workspaceId });
  return request<{ records: EventIngestionRecord[] }>(
    `/automation/events/ingestion?${params.toString()}`,
    {
      sessionId: input.sessionId,
    },
  );
}

export async function publishAutomationEvent(input: {
  sessionId: string;
  eventType: string;
  sourceSystem: string;
  payload?: Record<string, unknown>;
}): Promise<ApiResponse<{ accepted: boolean; eventId: string }>> {
  return request<{ accepted: boolean; eventId: string }>("/automation/events/publish", {
    method: "POST",
    sessionId: input.sessionId,
    body: {
      eventType: input.eventType,
      sourceSystem: input.sourceSystem,
      payload: input.payload ?? {},
    },
  });
}

export async function updateNotificationPreference(input: {
  sessionId: string;
  email: boolean;
  inApp: boolean;
  webhook: boolean;
}): Promise<ApiResponse<{ preference: NotificationPreferenceRecord }>> {
  return request<{ preference: NotificationPreferenceRecord }>(
    "/notifications/preferences/update",
    {
      method: "POST",
      sessionId: input.sessionId,
      body: {
        email: input.email,
        inApp: input.inApp,
        webhook: input.webhook,
      },
    },
  );
}

export async function listNotificationPreferences(input: {
  sessionId: string;
  workspaceId: string;
}): Promise<ApiResponse<{ preferences: NotificationPreferenceRecord[] }>> {
  const params = new URLSearchParams({ workspaceId: input.workspaceId });
  return request<{ preferences: NotificationPreferenceRecord[] }>(
    `/notifications/preferences/list?${params.toString()}`,
    { sessionId: input.sessionId },
  );
}

export async function listWebhookDeliveries(input: {
  sessionId: string;
  workspaceId: string;
}): Promise<ApiResponse<{ deliveries: OutboundWebhookDeliveryRecord[] }>> {
  const params = new URLSearchParams({ workspaceId: input.workspaceId });
  return request<{ deliveries: OutboundWebhookDeliveryRecord[] }>(
    `/webhooks/outbound/list?${params.toString()}`,
    { sessionId: input.sessionId },
  );
}

export async function replayWebhookDelivery(input: {
  sessionId: string;
  deliveryId: string;
}): Promise<ApiResponse<{ delivery: OutboundWebhookDeliveryRecord }>> {
  return request<{ delivery: OutboundWebhookDeliveryRecord }>(
    "/webhooks/outbound/replay",
    {
      method: "POST",
      sessionId: input.sessionId,
      body: {
        deliveryId: input.deliveryId,
      },
    },
  );
}
