import { randomUUID } from "node:crypto";

import type {
  AnalyticsEventRecord,
  AnalyticsPayloadValidationStatus,
  EntitlementIntegrityAnomaly,
  EntitlementSnapshot,
} from "@ethoxford/contracts";

import { DomainError } from "./shared.js";

export type SubscriptionState =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete";

export type BillingUiStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "payment_failed"
  | "canceled"
  | "pending_sync";

export interface SubscriptionRecord {
  subscriptionId: string;
  workspaceId: string;
  planId: string;
  state: SubscriptionState;
  sourceEventId: string;
  lastSyncedAt: string;
  updatedAt: string;
  correlationId?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
}

export interface BillingWebhookEventRecord {
  sourceSystem: string;
  sourceEventId: string;
  eventType:
    | "subscription.activated"
    | "subscription.changed"
    | "subscription.canceled"
    | "invoice.payment_failed";
  signatureVerified: boolean;
  receivedAt: string;
  processedAt?: string;
  processingStatus:
    | "processed"
    | "duplicate"
    | "rejected_signature"
    | "ignored_out_of_order";
  attemptCount: number;
  idempotencyKey: string;
  lastErrorClass?: string;
}

export interface EntitlementPolicy {
  planId: string;
  features: Record<string, boolean>;
  quotas: Record<string, number>;
}

export interface UsageCounterRecord {
  workspaceId: string;
  metric: string;
  consumedUnits: number;
  counterVersion: number;
  lastIncrementAt: string;
  lastIncrementCorrelationId?: string;
}

interface UsageCounterInternal extends UsageCounterRecord {
  idempotencyKeys: Set<string>;
}

export interface BillingAnalyticsEventRecord extends AnalyticsEventRecord {
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}

export class InMemoryBillingService {
  private readonly webhookDedupe = new Set<string>();
  private readonly subscriptions = new Map<string, SubscriptionRecord>();
  private readonly policies = new Map<string, EntitlementPolicy>();
  private readonly usageCounters = new Map<string, UsageCounterInternal>();
  private readonly webhookEvents: BillingWebhookEventRecord[] = [];
  private readonly analyticsEvents: BillingAnalyticsEventRecord[] = [];
  private readonly analyticsEventsByIdempotency = new Map<string, BillingAnalyticsEventRecord>();
  private readonly integrityAnomalies: EntitlementIntegrityAnomaly[] = [];

  reconcileWebhook(input: {
    sourceEventId: string;
    workspaceId: string;
    type:
      | "subscription.activated"
      | "subscription.changed"
      | "subscription.canceled"
      | "invoice.payment_failed";
    planId?: string;
    occurredAt?: string;
    correlationId?: string;
    sourceSystem?: string;
    signatureVerified?: boolean;
    providerCustomerId?: string;
    providerSubscriptionId?: string;
  }): SubscriptionRecord {
    const sourceSystem = input.sourceSystem ?? "billing";
    const dedupeKey = `${sourceSystem}:${input.sourceEventId}`;
    const receivedAt = new Date().toISOString();
    const idempotencyKey = `bill_${input.sourceEventId}`;
    const signatureVerified = input.signatureVerified ?? true;

    if (!signatureVerified) {
      this.webhookEvents.push({
        sourceSystem,
        sourceEventId: input.sourceEventId,
        eventType: input.type,
        signatureVerified: false,
        receivedAt,
        processingStatus: "rejected_signature",
        attemptCount: 1,
        idempotencyKey,
        lastErrorClass: "policy_denied",
      });

      throw new DomainError("policy_denied", "Webhook signature verification failed", {
        sourceEventId: input.sourceEventId,
      });
    }

    const current = this.subscriptions.get(input.workspaceId);
    if (this.webhookDedupe.has(dedupeKey)) {
      this.webhookEvents.push({
        sourceSystem,
        sourceEventId: input.sourceEventId,
        eventType: input.type,
        signatureVerified: true,
        receivedAt,
        processedAt: receivedAt,
        processingStatus: "duplicate",
        attemptCount: 1,
        idempotencyKey,
      });

      if (!current) {
        throw new DomainError("not_found", "Subscription missing after deduped event", {
          workspaceId: input.workspaceId,
        });
      }

      return current;
    }

    const occurredAt = input.occurredAt ?? receivedAt;
    if (current && Date.parse(occurredAt) < Date.parse(current.updatedAt)) {
      this.webhookDedupe.add(dedupeKey);
      this.webhookEvents.push({
        sourceSystem,
        sourceEventId: input.sourceEventId,
        eventType: input.type,
        signatureVerified: true,
        receivedAt,
        processedAt: receivedAt,
        processingStatus: "ignored_out_of_order",
        attemptCount: 1,
        idempotencyKey,
      });

      return current;
    }

    const next: SubscriptionRecord = {
      subscriptionId: current?.subscriptionId ?? `sub_${randomUUID()}`,
      workspaceId: input.workspaceId,
      planId: input.planId ?? current?.planId ?? "free",
      state: this.resolveState(input.type),
      sourceEventId: input.sourceEventId,
      lastSyncedAt: receivedAt,
      updatedAt: occurredAt,
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      ...(input.providerCustomerId ? { providerCustomerId: input.providerCustomerId } : {}),
      ...(input.providerSubscriptionId
        ? { providerSubscriptionId: input.providerSubscriptionId }
        : {}),
    };

    this.subscriptions.set(input.workspaceId, next);
    this.webhookDedupe.add(dedupeKey);
    this.webhookEvents.push({
      sourceSystem,
      sourceEventId: input.sourceEventId,
      eventType: input.type,
      signatureVerified: true,
      receivedAt,
      processedAt: receivedAt,
      processingStatus: "processed",
      attemptCount: 1,
      idempotencyKey,
    });

    return next;
  }

  setEntitlementPolicy(policy: EntitlementPolicy): void {
    this.policies.set(policy.planId, policy);
  }

  checkFeature(workspaceId: string, feature: string): boolean {
    const subscription = this.requireSubscription(workspaceId);
    const policy = this.requirePolicy(subscription.planId);
    return policy.features[feature] ?? false;
  }

  recordUsage(
    workspaceId: string,
    metric: string,
    amount = 1,
    options?: {
      idempotencyKey?: string;
      correlationId?: string;
    },
  ): void {
    if (amount <= 0) {
      throw new DomainError("validation_denied", "Usage amount must be greater than 0", {
        field: "amount",
      });
    }

    const key = this.usageKey(workspaceId, metric);
    const current = this.usageCounters.get(key);
    const now = new Date().toISOString();

    const existing: UsageCounterInternal =
      current ??
      {
        workspaceId,
        metric,
        consumedUnits: 0,
        counterVersion: 0,
        lastIncrementAt: now,
        idempotencyKeys: new Set<string>(),
      };

    if (options?.idempotencyKey && existing.idempotencyKeys.has(options.idempotencyKey)) {
      return;
    }

    const next: UsageCounterInternal = {
      ...existing,
      consumedUnits: existing.consumedUnits + amount,
      counterVersion: existing.counterVersion + 1,
      lastIncrementAt: now,
      ...(options?.correlationId
        ? { lastIncrementCorrelationId: options.correlationId }
        : {}),
      idempotencyKeys: new Set(existing.idempotencyKeys),
    };

    if (options?.idempotencyKey) {
      next.idempotencyKeys.add(options.idempotencyKey);
    }

    this.usageCounters.set(key, next);
  }

  checkQuota(workspaceId: string, metric: string): {
    allowed: boolean;
    remaining: number;
  } {
    const subscription = this.requireSubscription(workspaceId);
    const policy = this.requirePolicy(subscription.planId);

    const max = policy.quotas[metric];
    if (max === undefined) {
      return {
        allowed: true,
        remaining: Number.POSITIVE_INFINITY,
      };
    }

    const used = this.usageCounters.get(this.usageKey(workspaceId, metric))?.consumedUnits ?? 0;
    return {
      allowed: used < max,
      remaining: Math.max(max - used, 0),
    };
  }

  getUsageCounter(workspaceId: string, metric: string): UsageCounterRecord | undefined {
    const counter = this.usageCounters.get(this.usageKey(workspaceId, metric));
    if (!counter) {
      return undefined;
    }

    return {
      workspaceId: counter.workspaceId,
      metric: counter.metric,
      consumedUnits: counter.consumedUnits,
      counterVersion: counter.counterVersion,
      lastIncrementAt: counter.lastIncrementAt,
      ...(counter.lastIncrementCorrelationId
        ? { lastIncrementCorrelationId: counter.lastIncrementCorrelationId }
        : {}),
    };
  }

  getUiStatus(workspaceId: string): BillingUiStatus {
    const subscription = this.requireSubscription(workspaceId);

    switch (subscription.state) {
      case "active":
        return "active";
      case "trialing":
        return "trialing";
      case "past_due":
        return "payment_failed";
      case "canceled":
        return "canceled";
      case "incomplete":
      default:
        return "pending_sync";
    }
  }

  listWebhookEvents(): BillingWebhookEventRecord[] {
    return this.webhookEvents;
  }

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
  }): BillingAnalyticsEventRecord {
    if (!input.eventName.trim()) {
      throw new DomainError("validation_denied", "eventName is required", {
        field: "eventName",
      });
    }

    if (!input.eventVersion.trim()) {
      throw new DomainError("validation_denied", "eventVersion is required", {
        field: "eventVersion",
      });
    }

    if (!input.correlationId.trim()) {
      throw new DomainError("validation_denied", "correlationId is required", {
        field: "correlationId",
      });
    }

    if (!input.entitlementSnapshot.featureKey.trim()) {
      throw new DomainError("validation_denied", "entitlementSnapshot.featureKey is required", {
        field: "entitlementSnapshot.featureKey",
      });
    }

    if (!this.isValidAnalyticsPayloadStatus(input.payloadValidationStatus)) {
      throw new DomainError(
        "validation_denied",
        "payloadValidationStatus is invalid",
        {
          field: "payloadValidationStatus",
        },
      );
    }

    if (input.idempotencyKey) {
      const existing = this.analyticsEventsByIdempotency.get(input.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const activeSubscription = this.requireSubscription(input.workspaceId);
    const planId = input.planId ?? activeSubscription.planId;
    const occurredAt = input.occurredAt ?? new Date().toISOString();

    const event: BillingAnalyticsEventRecord = {
      analyticsEventId: `aevt_${randomUUID()}`,
      workspaceId: input.workspaceId,
      eventName: input.eventName,
      eventVersion: input.eventVersion,
      occurredAt,
      correlationId: input.correlationId,
      planId,
      entitlementSnapshot: input.entitlementSnapshot,
      payloadValidationStatus: input.payloadValidationStatus,
      payload: input.payload ?? {},
      ...(input.actorId ? { actorId: input.actorId } : {}),
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    };

    this.analyticsEvents.push(event);
    if (input.idempotencyKey) {
      this.analyticsEventsByIdempotency.set(input.idempotencyKey, event);
    }

    if (planId !== activeSubscription.planId) {
      this.integrityAnomalies.push({
        anomalyId: `anom_${randomUUID()}`,
        workspaceId: input.workspaceId,
        eventName: input.eventName,
        expectedPlanId: activeSubscription.planId,
        observedPlanId: planId,
        correlationId: input.correlationId,
        detectedAt: new Date().toISOString(),
      });
    }

    return event;
  }

  listAnalyticsEvents(workspaceId?: string): BillingAnalyticsEventRecord[] {
    return this.analyticsEvents.filter(
      (event) => workspaceId === undefined || event.workspaceId === workspaceId,
    );
  }

  listIntegrityAnomalies(workspaceId?: string): EntitlementIntegrityAnomaly[] {
    return this.integrityAnomalies.filter(
      (event) => workspaceId === undefined || event.workspaceId === workspaceId,
    );
  }

  private resolveState(
    eventType:
      | "subscription.activated"
      | "subscription.changed"
      | "subscription.canceled"
      | "invoice.payment_failed",
  ): SubscriptionState {
    switch (eventType) {
      case "subscription.activated":
        return "active";
      case "subscription.changed":
        return "active";
      case "invoice.payment_failed":
        return "past_due";
      case "subscription.canceled":
        return "canceled";
      default:
        return "incomplete";
    }
  }

  private usageKey(workspaceId: string, metric: string): string {
    return `${workspaceId}:${metric}`;
  }

  private isValidAnalyticsPayloadStatus(
    status: string,
  ): status is AnalyticsPayloadValidationStatus {
    return (
      status === "valid" ||
      status === "missing_required_fields" ||
      status === "invalid_schema"
    );
  }

  private requireSubscription(workspaceId: string): SubscriptionRecord {
    const subscription = this.subscriptions.get(workspaceId);

    if (!subscription) {
      throw new DomainError("not_found", "Subscription not found", {
        workspaceId,
      });
    }

    return subscription;
  }

  private requirePolicy(planId: string): EntitlementPolicy {
    const policy = this.policies.get(planId);

    if (!policy) {
      throw new DomainError("not_found", "Entitlement policy not found", {
        planId,
      });
    }

    return policy;
  }
}
