import { randomUUID } from "node:crypto";

import type { EventEnvelope } from "@ethoxford/contracts";

import { DomainError, ensureWorkspaceContext, type RequestContext } from "./shared.js";

export type CanonicalEvent = EventEnvelope<string, Record<string, unknown>>;

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

type Subscriber = (event: CanonicalEvent) => Promise<void>;

export class InMemoryEventBus {
  private readonly subscribers = new Map<string, Subscriber[]>();
  private readonly dedupe = new Set<string>();
  private readonly ingestionRecords: EventIngestionRecord[] = [];

  subscribe(eventType: string, handler: Subscriber): void {
    const existing = this.subscribers.get(eventType) ?? [];
    this.subscribers.set(eventType, existing.concat(handler));
  }

  async publish(
    event: CanonicalEvent,
    sourceSystem: string,
    sourceEventId?: string,
    options?: {
      signatureVerified?: boolean;
    },
  ): Promise<boolean> {
    const dedupeKey = `${sourceSystem}:${sourceEventId ?? event.eventId}`;
    const signatureVerified = options?.signatureVerified ?? true;
    const receivedAt = new Date().toISOString();

    if (!signatureVerified) {
      this.ingestionRecords.push({
        sourceSystem,
        sourceEventId: sourceEventId ?? event.eventId,
        eventType: event.eventType,
        eventId: event.eventId,
        signatureVerified: false,
        receivedAt,
        ingestionStatus: "rejected_signature",
        correlationId: event.correlationId,
        ...(event.workspaceId ? { workspaceId: event.workspaceId } : {}),
      });

      return false;
    }

    if (this.dedupe.has(dedupeKey)) {
      this.ingestionRecords.push({
        sourceSystem,
        sourceEventId: sourceEventId ?? event.eventId,
        eventType: event.eventType,
        eventId: event.eventId,
        signatureVerified: true,
        receivedAt,
        ingestionStatus: "duplicate",
        correlationId: event.correlationId,
        ...(event.workspaceId ? { workspaceId: event.workspaceId } : {}),
      });

      return false;
    }

    this.dedupe.add(dedupeKey);
    this.ingestionRecords.push({
      sourceSystem,
      sourceEventId: sourceEventId ?? event.eventId,
      eventType: event.eventType,
      eventId: event.eventId,
      signatureVerified: true,
      receivedAt,
      ingestionStatus: "accepted",
      correlationId: event.correlationId,
      ...(event.workspaceId ? { workspaceId: event.workspaceId } : {}),
    });

    const handlers = this.subscribers.get(event.eventType) ?? [];
    for (const handler of handlers) {
      await handler(event);
    }

    return true;
  }

  listIngestionRecords(): EventIngestionRecord[] {
    return this.ingestionRecords;
  }
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

export class InMemoryConnectorService {
  private readonly connectors = new Map<string, ConnectorRecord>();

  registerConnector(
    context: RequestContext,
    input: {
      provider: string;
      authType: ConnectorAuthType;
      credentialReference: string;
    },
  ): ConnectorRecord {
    const workspaceId = ensureWorkspaceContext(context);

    if (!input.provider.trim()) {
      throw new DomainError("validation_denied", "provider is required", {
        field: "provider",
      });
    }

    if (!input.credentialReference.trim()) {
      throw new DomainError("validation_denied", "credentialReference is required", {
        field: "credentialReference",
      });
    }

    const now = new Date().toISOString();
    const connector: ConnectorRecord = {
      connectorId: `conn_${randomUUID()}`,
      workspaceId,
      provider: input.provider,
      authType: input.authType,
      credentialReference: input.credentialReference,
      status: "connected",
      createdAt: now,
      updatedAt: now,
    };

    this.connectors.set(connector.connectorId, connector);
    return connector;
  }

  recordHealth(
    context: RequestContext,
    connectorId: string,
    healthStatus: ConnectorHealthStatus,
    options?: {
      errorMessage?: string;
    },
  ): ConnectorRecord {
    const connector = this.requireConnectorInWorkspace(context, connectorId);
    if (connector.status === "revoked") {
      throw new DomainError("conflict", "Connector is revoked", {
        connectorId,
      });
    }

    const nextStatus: ConnectorStatus =
      healthStatus === "healthy" ? "connected" : "degraded";
    const updated: ConnectorRecord = {
      ...connector,
      status: nextStatus,
      lastHealthStatus: healthStatus,
      lastHealthCheckAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(options?.errorMessage
        ? { lastErrorMessage: options.errorMessage.trim().slice(0, 500) }
        : {}),
    };

    this.connectors.set(connectorId, updated);
    return updated;
  }

  revokeConnector(context: RequestContext, connectorId: string): ConnectorRecord {
    const connector = this.requireConnectorInWorkspace(context, connectorId);

    if (connector.status === "revoked") {
      return connector;
    }

    const now = new Date().toISOString();
    const updated: ConnectorRecord = {
      ...connector,
      status: "revoked",
      revokedAt: now,
      updatedAt: now,
    };

    this.connectors.set(connectorId, updated);
    return updated;
  }

  listByWorkspace(workspaceId: string): ConnectorRecord[] {
    return [...this.connectors.values()].filter((connector) => connector.workspaceId === workspaceId);
  }

  private requireConnectorInWorkspace(
    context: RequestContext,
    connectorId: string,
  ): ConnectorRecord {
    const workspaceId = ensureWorkspaceContext(context);
    const connector = this.connectors.get(connectorId);

    if (!connector || connector.workspaceId !== workspaceId) {
      throw new DomainError("not_found", "Connector not found", {
        connectorId,
      });
    }

    return connector;
  }
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

export class InMemoryNotificationPreferenceService {
  private readonly preferences = new Map<string, NotificationPreferenceRecord>();

  upsert(
    context: RequestContext,
    input: {
      channels: NotificationChannelPreferences;
      userId?: string;
    },
  ): NotificationPreferenceRecord {
    const workspaceId = ensureWorkspaceContext(context);
    const actorId = this.requireActorId(context);
    const targetUserId = input.userId?.trim() || actorId;
    this.assertCanManageTarget(context, actorId, targetUserId);

    const key = this.preferenceKey(workspaceId, targetUserId);
    const now = new Date().toISOString();
    const existing = this.preferences.get(key);
    const normalizedChannels: NotificationChannelPreferences = {
      email: input.channels.email,
      inApp: input.channels.inApp,
      webhook: input.channels.webhook,
    };

    if (existing) {
      const updated: NotificationPreferenceRecord = {
        ...existing,
        channels: normalizedChannels,
        updatedAt: now,
      };
      this.preferences.set(key, updated);
      return updated;
    }

    const created: NotificationPreferenceRecord = {
      preferenceId: `npref_${randomUUID()}`,
      workspaceId,
      userId: targetUserId,
      channels: normalizedChannels,
      createdAt: now,
      updatedAt: now,
    };
    this.preferences.set(key, created);
    return created;
  }

  getForUser(context: RequestContext, userId?: string): NotificationPreferenceRecord {
    const workspaceId = ensureWorkspaceContext(context);
    const actorId = this.requireActorId(context);
    const targetUserId = userId?.trim() || actorId;
    this.assertCanManageTarget(context, actorId, targetUserId);

    const key = this.preferenceKey(workspaceId, targetUserId);
    const existing = this.preferences.get(key);

    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const created: NotificationPreferenceRecord = {
      preferenceId: `npref_${randomUUID()}`,
      workspaceId,
      userId: targetUserId,
      channels: {
        email: true,
        inApp: true,
        webhook: false,
      },
      createdAt: now,
      updatedAt: now,
    };
    this.preferences.set(key, created);
    return created;
  }

  listByWorkspace(workspaceId: string): NotificationPreferenceRecord[] {
    return [...this.preferences.values()]
      .filter((preference) => preference.workspaceId === workspaceId)
      .sort((a, b) => a.userId.localeCompare(b.userId));
  }

  private preferenceKey(workspaceId: string, userId: string): string {
    return `${workspaceId}:${userId}`;
  }

  private requireActorId(context: RequestContext): string {
    const actorId = context.actorId?.trim();
    if (!actorId) {
      throw new DomainError("auth_denied", "actorId is required for notification preferences", {
        field: "actorId",
      });
    }

    return actorId;
  }

  private assertCanManageTarget(
    context: RequestContext,
    actorId: string,
    targetUserId: string,
  ): void {
    if (targetUserId === actorId) {
      return;
    }

    if (context.roles.includes("owner") || context.roles.includes("admin")) {
      return;
    }

    throw new DomainError("policy_denied", "Cannot manage another user's preferences", {
      actorId,
      targetUserId,
    });
  }
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

export class InMemoryWebhookDeliveryService {
  private readonly deliveries = new Map<string, OutboundWebhookDeliveryRecord>();

  enqueue(
    context: RequestContext,
    input: {
      targetUrl: string;
      eventType: string;
      eventId: string;
      payload: Record<string, unknown>;
      maxAttempts?: number;
    },
  ): OutboundWebhookDeliveryRecord {
    const workspaceId = ensureWorkspaceContext(context);

    if (!input.targetUrl.trim()) {
      throw new DomainError("validation_denied", "targetUrl is required", {
        field: "targetUrl",
      });
    }

    if (!input.targetUrl.startsWith("http://") && !input.targetUrl.startsWith("https://")) {
      throw new DomainError("validation_denied", "targetUrl must start with http:// or https://", {
        field: "targetUrl",
      });
    }

    if (!input.eventType.trim()) {
      throw new DomainError("validation_denied", "eventType is required", {
        field: "eventType",
      });
    }

    if (!input.eventId.trim()) {
      throw new DomainError("validation_denied", "eventId is required", {
        field: "eventId",
      });
    }

    const maxAttempts = input.maxAttempts ?? 3;
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
      throw new DomainError("validation_denied", "maxAttempts must be an integer >= 1", {
        field: "maxAttempts",
      });
    }

    const now = new Date().toISOString();
    const delivery: OutboundWebhookDeliveryRecord = {
      deliveryId: `wh_${randomUUID()}`,
      workspaceId,
      targetUrl: input.targetUrl,
      eventType: input.eventType,
      eventId: input.eventId,
      payload: input.payload,
      idempotencyKey: `whk_${input.eventId}_${randomUUID()}`,
      attemptCount: 0,
      maxAttempts,
      status: "pending",
      queuedAt: now,
      updatedAt: now,
    };

    this.deliveries.set(delivery.deliveryId, delivery);
    return delivery;
  }

  recordAttempt(
    context: RequestContext,
    deliveryId: string,
    input: {
      success: boolean;
      errorMessage?: string;
    },
  ): OutboundWebhookDeliveryRecord {
    const delivery = this.requireDeliveryInWorkspace(context, deliveryId);

    if (delivery.status === "delivered") {
      return delivery;
    }

    if (delivery.status !== "pending" && delivery.status !== "failed") {
      throw new DomainError("conflict", "Delivery cannot be attempted in current state", {
        deliveryId,
        status: delivery.status,
      });
    }

    const attemptCount = delivery.attemptCount + 1;
    const now = new Date().toISOString();

    const { nextRetryAt: _nextRetryAt, completedAt: _completedAt, ...deliveryWithoutTimers } =
      delivery;

    if (input.success) {
      const delivered: OutboundWebhookDeliveryRecord = {
        ...deliveryWithoutTimers,
        attemptCount,
        status: "delivered",
        lastAttemptAt: now,
        completedAt: now,
        updatedAt: now,
      };

      this.deliveries.set(deliveryId, delivered);
      return delivered;
    }

    const exhausted = attemptCount >= delivery.maxAttempts;
    const failed: OutboundWebhookDeliveryRecord = {
      ...deliveryWithoutTimers,
      attemptCount,
      status: exhausted ? "dead_letter" : "failed",
      lastAttemptAt: now,
      updatedAt: now,
      ...(input.errorMessage
        ? { lastErrorMessage: input.errorMessage.trim().slice(0, 500) }
        : {}),
      ...(exhausted
        ? { completedAt: now }
        : { nextRetryAt: new Date(Date.now() + attemptCount * 5_000).toISOString() }),
    };

    this.deliveries.set(deliveryId, failed);
    return failed;
  }

  replay(context: RequestContext, deliveryId: string): OutboundWebhookDeliveryRecord {
    const delivery = this.requireDeliveryInWorkspace(context, deliveryId);

    if (delivery.status !== "failed" && delivery.status !== "dead_letter") {
      throw new DomainError("conflict", "Only failed or dead-letter deliveries can be replayed", {
        deliveryId,
        status: delivery.status,
      });
    }

    const now = new Date().toISOString();
    const { nextRetryAt: _nextRetryAt, completedAt: _completedAt, ...deliveryWithoutTimers } =
      delivery;
    const replayed: OutboundWebhookDeliveryRecord = {
      ...deliveryWithoutTimers,
      status: "pending",
      attemptCount: 0,
      updatedAt: now,
      idempotencyKey: `whk_${delivery.eventId}_${randomUUID()}`,
    };

    this.deliveries.set(deliveryId, replayed);
    return replayed;
  }

  listByWorkspace(workspaceId: string): OutboundWebhookDeliveryRecord[] {
    return [...this.deliveries.values()].filter(
      (delivery) => delivery.workspaceId === workspaceId,
    );
  }

  private requireDeliveryInWorkspace(
    context: RequestContext,
    deliveryId: string,
  ): OutboundWebhookDeliveryRecord {
    const workspaceId = ensureWorkspaceContext(context);
    const delivery = this.deliveries.get(deliveryId);

    if (!delivery || delivery.workspaceId !== workspaceId) {
      throw new DomainError("not_found", "Webhook delivery not found", {
        deliveryId,
      });
    }

    return delivery;
  }
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

type AutomationAction = (event: CanonicalEvent) => Promise<void>;

export class InMemoryAutomationEngine {
  private readonly rules = new Map<string, AutomationRule>();
  private readonly actions = new Map<string, AutomationAction>();
  private readonly idempotency = new Set<string>();
  private readonly runs: AutomationRun[] = [];

  registerAction(actionName: string, action: AutomationAction): void {
    this.actions.set(actionName, action);
  }

  addRule(rule: Omit<AutomationRule, "ruleId">): AutomationRule {
    if (!rule.workspaceId.trim()) {
      throw new DomainError("validation_denied", "workspaceId is required", {
        field: "workspaceId",
      });
    }

    if (!rule.eventType.trim()) {
      throw new DomainError("validation_denied", "eventType is required", {
        field: "eventType",
      });
    }

    if (!rule.actionName.trim()) {
      throw new DomainError("validation_denied", "actionName is required", {
        field: "actionName",
      });
    }

    if (!Number.isInteger(rule.maxRetries) || rule.maxRetries < 1) {
      throw new DomainError("validation_denied", "maxRetries must be >= 1", {
        field: "maxRetries",
      });
    }

    const withId: AutomationRule = {
      ...rule,
      ruleId: `rule_${randomUUID()}`,
    };

    this.rules.set(withId.ruleId, withId);
    return withId;
  }

  async process(event: CanonicalEvent): Promise<void> {
    if (!event.workspaceId) {
      throw new DomainError("validation_denied", "workspace_id is required for automation", {
        field: "workspaceId",
      });
    }

    const matchingRules = [...this.rules.values()].filter(
      (rule) => rule.eventType === event.eventType && rule.workspaceId === event.workspaceId,
    );

    for (const rule of matchingRules) {
      const idempotencyKey = `${rule.ruleId}:${event.eventId}`;
      if (this.idempotency.has(idempotencyKey)) {
        continue;
      }

      const action = this.actions.get(rule.actionName);
      if (!action) {
        throw new DomainError("not_found", "Automation action not registered", {
          actionName: rule.actionName,
        });
      }

      let attempts = 0;
      let completed = false;
      let lastError = "";
      const maxAttempts = Math.max(rule.maxRetries, 1);
      const startedAt = new Date().toISOString();

      while (attempts < maxAttempts && !completed) {
        attempts += 1;

        try {
          await action(event);
          completed = true;
        } catch (error: unknown) {
          lastError = error instanceof Error ? error.message : "unknown";
        }
      }

      if (!completed) {
        const completedAt = new Date().toISOString();
        this.runs.push({
          runId: `arun_${randomUUID()}`,
          workspaceId: rule.workspaceId,
          ruleId: rule.ruleId,
          eventId: event.eventId,
          idempotencyKey,
          status: "dead_letter",
          attempts,
          startedAt,
          completedAt,
          lastError,
        });

        throw new DomainError("unavailable", "Automation execution failed", {
          ruleId: rule.ruleId,
          eventId: event.eventId,
        });
      }

      this.idempotency.add(idempotencyKey);
      const completedAt = new Date().toISOString();
      this.runs.push({
        runId: `arun_${randomUUID()}`,
        workspaceId: rule.workspaceId,
        ruleId: rule.ruleId,
        eventId: event.eventId,
        idempotencyKey,
        status: "completed",
        attempts,
        startedAt,
        completedAt,
      });
    }
  }

  listRuns(workspaceId?: string): AutomationRun[] {
    return this.runs.filter(
      (run) => workspaceId === undefined || run.workspaceId === workspaceId,
    );
  }

  listRules(workspaceId?: string): AutomationRule[] {
    return [...this.rules.values()].filter(
      (rule) => workspaceId === undefined || rule.workspaceId === workspaceId,
    );
  }
}
