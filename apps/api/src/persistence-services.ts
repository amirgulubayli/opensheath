import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import {
  createEventEnvelope,
  type AgentRunRecord,
  type AnalyticsEventRecord,
  type AnalyticsPayloadValidationStatus,
  type CitationProvenance,
  type ConfidenceBand,
  type DocumentAsset,
  type DocumentEvent,
  type EntitlementIntegrityAnomaly,
  type EntitlementSnapshot,
  type EventEnvelope,
  type EvidenceType,
  type AutomationRule,
  type AutomationRun,
  type ConnectorAuthType,
  type ConnectorHealthStatus,
  type ConnectorRecord,
  type ConnectorStatus,
  type EventIngestionRecord,
  type NotificationPreferenceRecord,
  type NotificationChannelPreferences,
  type OutboundWebhookDeliveryRecord,
  type OutboundWebhookDeliveryStatus,
  type ProjectEvent,
  type ProjectRecord,
  type ProjectStatus,
  type RetrievalMethod,
  type RetrievalResultItem,
  type ToolCallRecord,
} from "@ethoxford/contracts";
import {
  DomainError,
  InMemoryAgentRuntimeService,
  InMemoryBillingService,
  InMemoryToolRegistry,
  ensureWorkspaceContext,
  type RequestContext,
  type Role,
} from "@ethoxford/domain";

const ALLOWED_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ["active", "archived"],
  active: ["archived"],
  archived: [],
};

async function withWorkspace<T>(
  pool: Pool,
  workspaceId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.current_workspace_id', $1, true)", [
      workspaceId,
    ]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

function requireActorId(context: RequestContext): string {
  if (!context.actorId) {
    throw new DomainError("auth_denied", "Missing actor in request context", {
      field: "actorId",
    });
  }

  return context.actorId;
}

async function ensureWorkspaceAndUser(
  client: PoolClient,
  input: {
    workspaceId: string;
    actorId?: string;
  },
): Promise<void> {
  const actorId = input.actorId ?? "usr_system";
  const email = input.actorId ? `user+${actorId}@demo.local` : "system@demo.local";

  await client.query(
    `insert into users (user_id, email)
     values ($1, $2)
     on conflict (user_id) do nothing`,
    [actorId, email],
  );

  await client.query(
    `insert into workspaces (workspace_id, name, owner_user_id)
     values ($1, $2, $3)
     on conflict (workspace_id) do nothing`,
    [input.workspaceId, "Demo Workspace", actorId],
  );

  await client.query(
    `insert into workspace_memberships (membership_id, workspace_id, user_id, role)
     values ($1, $2, $3, $4)
     on conflict (workspace_id, user_id) do nothing`,
    [`mem_${randomUUID()}`, input.workspaceId, actorId, "owner"],
  );
}

function mapProjectRow(row: Record<string, unknown>): ProjectRecord {
  return {
    projectId: String(row.project_id),
    workspaceId: String(row.workspace_id),
    name: String(row.name),
    ...(row.description ? { description: String(row.description) } : {}),
    status: row.status as ProjectStatus,
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapDocumentRow(row: Record<string, unknown>): DocumentAsset {
  return {
    documentId: String(row.document_id),
    workspaceId: String(row.workspace_id),
    name: String(row.name),
    source: String(row.source),
    status: row.status as DocumentAsset["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function recordEvent(
  client: PoolClient,
  input: {
    eventType: ProjectEvent["eventType"] | DocumentEvent["eventType"];
    payload: ProjectEvent["payload"] | DocumentEvent["payload"];
    context: RequestContext;
  },
): Promise<void> {
  const envelope = createEventEnvelope(input.eventType, input.payload, {
    eventId: `evt_${randomUUID()}`,
    correlationId: input.context.correlationId,
    workspaceId: input.context.workspaceId,
    actorId: input.context.actorId,
  });

  await client.query(
    `insert into events (event_id, workspace_id, actor_id, event_type, version, payload, correlation_id, occurred_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      envelope.eventId,
      envelope.workspaceId ?? null,
      envelope.actorId ?? null,
      envelope.eventType,
      envelope.version,
      envelope.payload,
      envelope.correlationId,
      envelope.occurredAt,
    ],
  );
}

export class PostgresProjectService {
  constructor(private readonly pool: Pool) {}

  async createProject(
    context: RequestContext,
    input: { name: string; description?: string },
  ): Promise<ProjectRecord> {
    const workspaceId = ensureWorkspaceContext(context);
    const actorId = requireActorId(context);

    if (!input.name.trim()) {
      throw new DomainError("validation_denied", "Project name is required", {
        field: "name",
      });
    }

    const now = new Date().toISOString();
    const project: ProjectRecord = {
      projectId: `prj_${randomUUID()}`,
      workspaceId,
      name: input.name,
      ...(input.description ? { description: input.description } : {}),
      status: "draft",
      createdBy: actorId,
      createdAt: now,
      updatedAt: now,
    };

    return withWorkspace(this.pool, workspaceId, async (client) => {
      await ensureWorkspaceAndUser(client, {
        workspaceId,
        actorId,
      });

      await client.query(
        `insert into projects (project_id, workspace_id, name, description, status, created_by, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          project.projectId,
          project.workspaceId,
          project.name,
          project.description ?? null,
          project.status,
          project.createdBy,
          project.createdAt,
          project.updatedAt,
        ],
      );

      await recordEvent(client, {
        eventType: "project.created",
        payload: {
          projectId: project.projectId,
          workspaceId: project.workspaceId,
          status: project.status,
        },
        context,
      });

      return project;
    });
  }

  async updateProject(
    context: RequestContext,
    projectId: string,
    input: { name?: string; description?: string },
  ): Promise<ProjectRecord> {
    const workspaceId = ensureWorkspaceContext(context);

    if (input.name !== undefined && !input.name.trim()) {
      throw new DomainError("validation_denied", "Project name cannot be empty", {
        field: "name",
      });
    }

    return withWorkspace(this.pool, workspaceId, async (client) => {
      const existing = await client.query(
        `select * from projects where project_id = $1 and workspace_id = $2`,
        [projectId, workspaceId],
      );

      if (existing.rowCount === 0) {
        throw new DomainError("not_found", "Project not found", { projectId });
      }

      const current = mapProjectRow(existing.rows[0]);
      const updated: ProjectRecord = {
        ...current,
        name: input.name ?? current.name,
        ...(input.description !== undefined ? { description: input.description } : {}),
        updatedAt: new Date().toISOString(),
      };

      await client.query(
        `update projects set name = $1, description = $2, updated_at = $3 where project_id = $4`,
        [updated.name, updated.description ?? null, updated.updatedAt, updated.projectId],
      );

      await recordEvent(client, {
        eventType: "project.updated",
        payload: {
          projectId: updated.projectId,
          workspaceId: updated.workspaceId,
          status: updated.status,
        },
        context,
      });

      return updated;
    });
  }

  async transitionStatus(
    context: RequestContext,
    projectId: string,
    nextStatus: ProjectStatus,
  ): Promise<ProjectRecord> {
    const workspaceId = ensureWorkspaceContext(context);

    return withWorkspace(this.pool, workspaceId, async (client) => {
      const existing = await client.query(
        `select * from projects where project_id = $1 and workspace_id = $2`,
        [projectId, workspaceId],
      );

      if (existing.rowCount === 0) {
        throw new DomainError("not_found", "Project not found", { projectId });
      }

      const current = mapProjectRow(existing.rows[0]);
      const allowed = ALLOWED_TRANSITIONS[current.status];
      if (!allowed.includes(nextStatus)) {
        throw new DomainError("validation_denied", "Invalid project status transition", {
          from: current.status,
          to: nextStatus,
        });
      }

      const updated: ProjectRecord = {
        ...current,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };

      await client.query(`update projects set status = $1, updated_at = $2 where project_id = $3`, [
        updated.status,
        updated.updatedAt,
        updated.projectId,
      ]);

      await recordEvent(client, {
        eventType: nextStatus === "archived" ? "project.archived" : "project.updated",
        payload: {
          projectId: updated.projectId,
          workspaceId: updated.workspaceId,
          status: updated.status,
        },
        context,
      });

      return updated;
    });
  }

  async listByWorkspace(workspaceId: string): Promise<ProjectRecord[]> {
    return withWorkspace(this.pool, workspaceId, async (client) => {
      const result = await client.query(`select * from projects where workspace_id = $1`, [
        workspaceId,
      ]);
      return result.rows.map(mapProjectRow);
    });
  }

  async getActivity(
    context: RequestContext,
    projectId: string,
  ): Promise<ProjectEvent[]> {
    const workspaceId = ensureWorkspaceContext(context);
    return withWorkspace(this.pool, workspaceId, async (client) => {
      const result = await client.query(
        `select event_id, event_type, payload, correlation_id, occurred_at, workspace_id, actor_id, version
         from events
         where workspace_id = $1 and payload ->> 'projectId' = $2
         order by occurred_at desc`,
        [workspaceId, projectId],
      );

      return result.rows.map((row) => ({
        eventId: String(row.event_id),
        eventType: row.event_type,
        occurredAt: String(row.occurred_at),
        correlationId: String(row.correlation_id),
        version: row.version,
        payload: row.payload,
        ...(row.workspace_id ? { workspaceId: row.workspace_id } : {}),
        ...(row.actor_id ? { actorId: row.actor_id } : {}),
      })) as ProjectEvent[];
    });
  }
}

export class PostgresWorkspaceService {
  constructor(private readonly pool: Pool) {}

  async createWorkspace(ownerUserId: string, name: string): Promise<{ workspaceId: string; name: string; ownerUserId: string }> {
    if (!name.trim()) {
      throw new DomainError("validation_denied", "Workspace name is required", {
        field: "name",
      });
    }

    const workspaceId = `ws_${randomUUID()}`;
    await withWorkspace(this.pool, workspaceId, async (client) => {
      await ensureWorkspaceAndUser(client, { workspaceId, actorId: ownerUserId });
      await client.query(
        `update workspaces set name = $1, owner_user_id = $2 where workspace_id = $3`,
        [name, ownerUserId, workspaceId],
      );
    });

    return { workspaceId, name, ownerUserId };
  }

  async inviteMember(
    context: RequestContext,
    workspaceId: string,
    email: string,
    role: Role,
  ): Promise<string> {
    if (!email.trim()) {
      throw new DomainError("validation_denied", "Invite email is required", {
        field: "email",
      });
    }

    const inviteToken = `inv_${randomUUID()}`;
    await withWorkspace(this.pool, workspaceId, async (client) => {
      await ensureWorkspaceAndUser(client, {
        workspaceId,
        ...(context.actorId ? { actorId: context.actorId } : {}),
      });

      await client.query(
        `insert into workspace_invites (invite_token, workspace_id, email, role, invited_by)
         values ($1, $2, $3, $4, $5)`,
        [inviteToken, workspaceId, email.toLowerCase(), role, context.actorId ?? "usr_system"],
      );

      await client.query(
        `insert into audit_logs (audit_id, workspace_id, actor_id, action, metadata, occurred_at)
         values ($1, $2, $3, $4, $5, $6)`,
        [
          `audit_${randomUUID()}`,
          workspaceId,
          context.actorId ?? null,
          "membership.invite",
          { inviteToken, email: email.toLowerCase(), role },
          new Date().toISOString(),
        ],
      );
    });

    return inviteToken;
  }

  async acceptInvite(
    inviteToken: string,
    userId: string,
  ): Promise<{ workspaceId: string; userId: string; role: Role }> {
    const invite = await this.lookupInvite(inviteToken);

    await withWorkspace(this.pool, invite.workspaceId, async (client) => {
      await ensureWorkspaceAndUser(client, {
        workspaceId: invite.workspaceId,
        actorId: userId,
      });
      await client.query(
        `insert into workspace_memberships (membership_id, workspace_id, user_id, role)
         values ($1, $2, $3, $4)
         on conflict (workspace_id, user_id) do update set role = excluded.role`,
        [`mem_${randomUUID()}`, invite.workspaceId, userId, invite.role],
      );

      await client.query(`delete from workspace_invites where invite_token = $1`, [
        inviteToken,
      ]);

      await client.query(
        `insert into audit_logs (audit_id, workspace_id, actor_id, action, metadata, occurred_at)
         values ($1, $2, $3, $4, $5, $6)`,
        [
          `audit_${randomUUID()}`,
          invite.workspaceId,
          userId,
          "membership.accept",
          { inviteToken, role: invite.role },
          new Date().toISOString(),
        ],
      );
    });

    return { workspaceId: invite.workspaceId, userId, role: invite.role };
  }

  async updateRole(
    context: RequestContext,
    workspaceId: string,
    targetUserId: string,
    role: Role,
  ): Promise<{ workspaceId: string; userId: string; role: Role }> {
    await withWorkspace(this.pool, workspaceId, async (client) => {
      await ensureWorkspaceAndUser(client, { workspaceId, actorId: targetUserId });
      await client.query(
        `update workspace_memberships set role = $1 where workspace_id = $2 and user_id = $3`,
        [role, workspaceId, targetUserId],
      );
    });

    return { workspaceId, userId: targetUserId, role };
  }

  async removeMember(
    _context: RequestContext,
    workspaceId: string,
    targetUserId: string,
  ): Promise<void> {
    await withWorkspace(this.pool, workspaceId, async (client) => {
      await client.query(
        `delete from workspace_memberships where workspace_id = $1 and user_id = $2`,
        [workspaceId, targetUserId],
      );
    });
  }

  async listMembers(workspaceId: string): Promise<Array<{ workspaceId: string; userId: string; role: Role }>> {
    return withWorkspace(this.pool, workspaceId, async (client) => {
      const result = await client.query(
        `select workspace_id, user_id, role from workspace_memberships where workspace_id = $1`,
        [workspaceId],
      );
      return result.rows.map((row) => ({
        workspaceId: String(row.workspace_id),
        userId: String(row.user_id),
        role: row.role as Role,
      }));
    });
  }

  async getRolesForUser(userId: string, workspaceId: string): Promise<Role[]> {
    return withWorkspace(this.pool, workspaceId, async (client) => {
      const result = await client.query(
        `select role from workspace_memberships where workspace_id = $1 and user_id = $2`,
        [workspaceId, userId],
      );
      return result.rows.map((row) => row.role as Role);
    });
  }

  private async lookupInvite(inviteToken: string): Promise<{ workspaceId: string; role: Role }>{
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `select workspace_id, role from workspace_invites where invite_token = $1`,
        [inviteToken],
      );
      if (result.rowCount === 0) {
        throw new DomainError("not_found", "Invite not found", { inviteToken });
      }

      return {
        workspaceId: String(result.rows[0].workspace_id),
        role: result.rows[0].role as Role,
      };
    } finally {
      client.release();
    }
  }
}

type CanonicalEvent = EventEnvelope<string, Record<string, unknown>>;

export class PostgresConnectorService {
  constructor(private readonly pool: Pool) {}

  async registerConnector(
    context: RequestContext,
    input: { provider: string; authType: ConnectorAuthType; credentialReference: string },
  ): Promise<ConnectorRecord> {
    const workspaceId = ensureWorkspaceContext(context);
    if (!input.provider.trim()) {
      throw new DomainError("validation_denied", "provider is required", { field: "provider" });
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

    await withWorkspace(this.pool, workspaceId, async (client) => {
      await ensureWorkspaceAndUser(client, {
        workspaceId,
        ...(context.actorId ? { actorId: context.actorId } : {}),
      });
      await client.query(
        `insert into integrations (integration_id, workspace_id, provider, auth_type, credential_reference, status, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          connector.connectorId,
          connector.workspaceId,
          connector.provider,
          connector.authType,
          connector.credentialReference,
          connector.status,
          connector.createdAt,
          connector.updatedAt,
        ],
      );
    });

    return connector;
  }

  async recordHealth(
    context: RequestContext,
    connectorId: string,
    healthStatus: ConnectorHealthStatus,
    options?: { errorMessage?: string },
  ): Promise<ConnectorRecord> {
    const workspaceId = ensureWorkspaceContext(context);
    return withWorkspace(this.pool, workspaceId, async (client) => {
      const existing = await client.query(
        `select * from integrations where integration_id = $1 and workspace_id = $2`,
        [connectorId, workspaceId],
      );
      if (existing.rowCount === 0) {
        throw new DomainError("not_found", "Connector not found", { connectorId });
      }

      const row = existing.rows[0];
      if (row.status === "revoked") {
        throw new DomainError("conflict", "Connector is revoked", { connectorId });
      }

      const nextStatus: ConnectorStatus =
        healthStatus === "healthy" ? "connected" : "degraded";
      const updatedAt = new Date().toISOString();

      await client.query(
        `update integrations
         set status = $1,
             last_health_status = $2,
             last_health_check_at = $3,
             last_error_message = $4,
             updated_at = $5
         where integration_id = $6`,
        [
          nextStatus,
          healthStatus,
          updatedAt,
          options?.errorMessage ? options.errorMessage.trim().slice(0, 500) : null,
          updatedAt,
          connectorId,
        ],
      );

      return {
        connectorId,
        workspaceId,
        provider: String(row.provider),
        authType: row.auth_type as ConnectorAuthType,
        credentialReference: String(row.credential_reference),
        status: nextStatus,
        createdAt: String(row.created_at),
        updatedAt,
        lastHealthStatus: healthStatus,
        lastHealthCheckAt: updatedAt,
        ...(options?.errorMessage ? { lastErrorMessage: options.errorMessage.trim().slice(0, 500) } : {}),
      };
    });
  }

  async revokeConnector(
    context: RequestContext,
    connectorId: string,
  ): Promise<ConnectorRecord> {
    const workspaceId = ensureWorkspaceContext(context);
    return withWorkspace(this.pool, workspaceId, async (client) => {
      const existing = await client.query(
        `select * from integrations where integration_id = $1 and workspace_id = $2`,
        [connectorId, workspaceId],
      );
      if (existing.rowCount === 0) {
        throw new DomainError("not_found", "Connector not found", { connectorId });
      }

      const row = existing.rows[0];
      if (row.status === "revoked") {
        return {
          connectorId,
          workspaceId,
          provider: String(row.provider),
          authType: row.auth_type as ConnectorAuthType,
          credentialReference: String(row.credential_reference),
          status: "revoked",
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
          ...(row.revoked_at ? { revokedAt: String(row.revoked_at) } : {}),
        };
      }

      const now = new Date().toISOString();
      await client.query(
        `update integrations set status = $1, revoked_at = $2, updated_at = $3 where integration_id = $4`,
        ["revoked", now, now, connectorId],
      );

      return {
        connectorId,
        workspaceId,
        provider: String(row.provider),
        authType: row.auth_type as ConnectorAuthType,
        credentialReference: String(row.credential_reference),
        status: "revoked",
        createdAt: String(row.created_at),
        updatedAt: now,
        revokedAt: now,
      };
    });
  }

  async listByWorkspace(workspaceId: string): Promise<ConnectorRecord[]> {
    return withWorkspace(this.pool, workspaceId, async (client) => {
      const result = await client.query(
        `select * from integrations where workspace_id = $1`,
        [workspaceId],
      );
      return result.rows.map((row) => ({
        connectorId: String(row.integration_id),
        workspaceId: String(row.workspace_id),
        provider: String(row.provider),
        authType: row.auth_type as ConnectorAuthType,
        credentialReference: String(row.credential_reference),
        status: row.status as ConnectorStatus,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
        ...(row.last_health_status ? { lastHealthStatus: row.last_health_status as ConnectorHealthStatus } : {}),
        ...(row.last_health_check_at ? { lastHealthCheckAt: String(row.last_health_check_at) } : {}),
        ...(row.last_error_message ? { lastErrorMessage: String(row.last_error_message) } : {}),
        ...(row.revoked_at ? { revokedAt: String(row.revoked_at) } : {}),
      }));
    });
  }
}

export class PostgresEventBus {
  constructor(private readonly pool: Pool) {}

  async publish(
    event: CanonicalEvent,
    sourceSystem: string,
    sourceEventId?: string,
    options?: { signatureVerified?: boolean },
  ): Promise<boolean> {
    const dedupeKey = `${sourceSystem}:${sourceEventId ?? event.eventId}`;
    const signatureVerified = options?.signatureVerified ?? true;
    const receivedAt = new Date().toISOString();
    const workspaceId = event.workspaceId ?? null;

    const client = await this.pool.connect();
    try {
      await client.query("begin");
      if (workspaceId) {
        await client.query("select set_config('app.current_workspace_id', $1, true)", [
          workspaceId,
        ]);
      }

      if (!signatureVerified) {
        await client.query(
          `insert into automation_event_ingestions (ingestion_id, workspace_id, source_system, source_event_id, event_type, event_id, signature_verified, received_at, ingestion_status, correlation_id)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            `ing_${randomUUID()}`,
            workspaceId,
            sourceSystem,
            sourceEventId ?? event.eventId,
            event.eventType,
            event.eventId,
            false,
            receivedAt,
            "rejected_signature",
            event.correlationId,
          ],
        );
        await client.query("commit");
        return false;
      }

      const existing = await client.query(
        `select ingestion_id from automation_event_ingestions where source_system = $1 and source_event_id = $2`,
        [sourceSystem, sourceEventId ?? event.eventId],
      );
      if (existing.rowCount > 0) {
        await client.query(
          `insert into automation_event_ingestions (ingestion_id, workspace_id, source_system, source_event_id, event_type, event_id, signature_verified, received_at, ingestion_status, correlation_id)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            `ing_${randomUUID()}`,
            workspaceId,
            sourceSystem,
            sourceEventId ?? event.eventId,
            event.eventType,
            event.eventId,
            true,
            receivedAt,
            "duplicate",
            event.correlationId,
          ],
        );
        await client.query("commit");
        return false;
      }

      await client.query(
        `insert into automation_event_ingestions (ingestion_id, workspace_id, source_system, source_event_id, event_type, event_id, signature_verified, received_at, ingestion_status, correlation_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          `ing_${randomUUID()}`,
          workspaceId,
          sourceSystem,
          sourceEventId ?? event.eventId,
          event.eventType,
          event.eventId,
          true,
          receivedAt,
          "accepted",
          event.correlationId,
        ],
      );

      await client.query(
        `insert into events (event_id, workspace_id, actor_id, event_type, version, payload, correlation_id, occurred_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (event_id) do nothing`,
        [
          event.eventId,
          workspaceId,
          event.actorId ?? null,
          event.eventType,
          event.version,
          event.payload,
          event.correlationId,
          event.occurredAt,
        ],
      );

      await client.query("commit");
      return true;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async listIngestionRecords(workspaceId?: string): Promise<EventIngestionRecord[]> {
    const client = await this.pool.connect();
    try {
      if (workspaceId) {
        await client.query("select set_config('app.current_workspace_id', $1, true)", [
          workspaceId,
        ]);
      }
      const result = await client.query(
        workspaceId
          ? `select * from automation_event_ingestions where workspace_id = $1 order by received_at desc`
          : `select * from automation_event_ingestions order by received_at desc`,
        workspaceId ? [workspaceId] : [],
      );
      return result.rows.map((row) => ({
        sourceSystem: String(row.source_system),
        sourceEventId: String(row.source_event_id),
        eventType: String(row.event_type),
        eventId: String(row.event_id),
        signatureVerified: Boolean(row.signature_verified),
        receivedAt: String(row.received_at),
        ingestionStatus: row.ingestion_status,
        correlationId: String(row.correlation_id),
        ...(row.workspace_id ? { workspaceId: String(row.workspace_id) } : {}),
      }));
    } finally {
      client.release();
    }
  }
}

type AutomationAction = (event: CanonicalEvent) => Promise<void>;

export class PostgresAutomationEngine {
  private readonly actions = new Map<string, AutomationAction>();

  constructor(private readonly pool: Pool) {}

  registerAction(actionName: string, action: AutomationAction): void {
    this.actions.set(actionName, action);
  }

  async addRule(rule: Omit<AutomationRule, "ruleId">): Promise<AutomationRule> {
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

    await withWorkspace(this.pool, rule.workspaceId, async (client) => {
      await client.query(
        `insert into automation_rules (rule_id, workspace_id, event_type, action_name, max_retries, created_at)
         values ($1, $2, $3, $4, $5, $6)`,
        [
          withId.ruleId,
          withId.workspaceId,
          withId.eventType,
          withId.actionName,
          withId.maxRetries,
          new Date().toISOString(),
        ],
      );
    });

    return withId;
  }

  async process(event: CanonicalEvent): Promise<void> {
    if (!event.workspaceId) {
      throw new DomainError("validation_denied", "workspace_id is required for automation", {
        field: "workspaceId",
      });
    }

    const rules = await this.listRules(event.workspaceId);
    const matching = rules.filter((rule) => rule.eventType === event.eventType);

    for (const rule of matching) {
      const idempotencyKey = `${rule.ruleId}:${event.eventId}`;
      const existing = await withWorkspace(this.pool, rule.workspaceId, async (client) => {
        const result = await client.query(
          `select run_id from automation_runs where idempotency_key = $1`,
          [idempotencyKey],
        );
        return result.rowCount > 0;
      });
      if (existing) {
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

      const completedAt = new Date().toISOString();
      const status: AutomationRun["status"] = completed ? "completed" : "dead_letter";
      await withWorkspace(this.pool, rule.workspaceId, async (client) => {
        await client.query(
          `insert into automation_runs (run_id, workspace_id, rule_id, event_id, idempotency_key, status, attempts, started_at, completed_at, last_error)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            `arun_${randomUUID()}`,
            rule.workspaceId,
            rule.ruleId,
            event.eventId,
            idempotencyKey,
            status,
            attempts,
            startedAt,
            completedAt,
            lastError || null,
          ],
        );
      });

      if (!completed) {
        throw new DomainError("unavailable", "Automation execution failed", {
          ruleId: rule.ruleId,
          eventId: event.eventId,
        });
      }
    }
  }

  async listRuns(workspaceId?: string): Promise<AutomationRun[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        workspaceId
          ? `select * from automation_runs where workspace_id = $1 order by completed_at desc`
          : `select * from automation_runs order by completed_at desc`,
        workspaceId ? [workspaceId] : [],
      );
      return result.rows.map((row) => ({
        runId: String(row.run_id),
        workspaceId: String(row.workspace_id),
        ruleId: String(row.rule_id),
        eventId: String(row.event_id),
        idempotencyKey: String(row.idempotency_key),
        status: row.status,
        attempts: Number(row.attempts),
        startedAt: String(row.started_at),
        completedAt: String(row.completed_at),
        ...(row.last_error ? { lastError: String(row.last_error) } : {}),
      }));
    } finally {
      client.release();
    }
  }

  async listRules(workspaceId?: string): Promise<AutomationRule[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        workspaceId
          ? `select * from automation_rules where workspace_id = $1`
          : `select * from automation_rules`,
        workspaceId ? [workspaceId] : [],
      );
      return result.rows.map((row) => ({
        ruleId: String(row.rule_id),
        workspaceId: String(row.workspace_id),
        eventType: String(row.event_type),
        actionName: String(row.action_name),
        maxRetries: Number(row.max_retries),
      }));
    } finally {
      client.release();
    }
  }
}

export class PostgresNotificationPreferenceService {
  constructor(private readonly pool: Pool) {}

  async upsert(
    context: RequestContext,
    input: { channels: NotificationChannelPreferences; userId?: string },
  ): Promise<NotificationPreferenceRecord> {
    const workspaceId = ensureWorkspaceContext(context);
    const actorId = context.actorId?.trim();
    if (!actorId) {
      throw new DomainError("auth_denied", "actorId is required for notification preferences", {
        field: "actorId",
      });
    }
    const targetUserId = input.userId?.trim() || actorId;
    if (targetUserId !== actorId && !context.roles.includes("owner") && !context.roles.includes("admin")) {
      throw new DomainError("policy_denied", "Cannot manage another user's preferences", {
        actorId,
        targetUserId,
      });
    }

    const now = new Date().toISOString();
    return withWorkspace(this.pool, workspaceId, async (client) => {
      await ensureWorkspaceAndUser(client, {
        workspaceId,
        actorId: targetUserId,
      });

      const existing = await client.query(
        `select preference_id, created_at from notification_preferences where workspace_id = $1 and user_id = $2`,
        [workspaceId, targetUserId],
      );

      if (existing.rowCount > 0) {
        await client.query(
          `update notification_preferences
           set channel_email = $1, channel_in_app = $2, channel_webhook = $3, updated_at = $4
           where workspace_id = $5 and user_id = $6`,
          [input.channels.email, input.channels.inApp, input.channels.webhook, now, workspaceId, targetUserId],
        );

        return {
          preferenceId: String(existing.rows[0].preference_id),
          workspaceId,
          userId: targetUserId,
          channels: { ...input.channels },
          createdAt: String(existing.rows[0].created_at),
          updatedAt: now,
        };
      }

      const created: NotificationPreferenceRecord = {
        preferenceId: `npref_${randomUUID()}`,
        workspaceId,
        userId: targetUserId,
        channels: { ...input.channels },
        createdAt: now,
        updatedAt: now,
      };
      await client.query(
        `insert into notification_preferences (preference_id, workspace_id, user_id, channel_email, channel_in_app, channel_webhook, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          created.preferenceId,
          workspaceId,
          targetUserId,
          created.channels.email,
          created.channels.inApp,
          created.channels.webhook,
          created.createdAt,
          created.updatedAt,
        ],
      );
      return created;
    });
  }

  async getForUser(
    context: RequestContext,
    userId?: string,
  ): Promise<NotificationPreferenceRecord> {
    const workspaceId = ensureWorkspaceContext(context);
    const actorId = context.actorId?.trim();
    if (!actorId) {
      throw new DomainError("auth_denied", "actorId is required for notification preferences", {
        field: "actorId",
      });
    }
    const targetUserId = userId?.trim() || actorId;
    if (targetUserId !== actorId && !context.roles.includes("owner") && !context.roles.includes("admin")) {
      throw new DomainError("policy_denied", "Cannot manage another user's preferences", {
        actorId,
        targetUserId,
      });
    }

    return withWorkspace(this.pool, workspaceId, async (client) => {
      const existing = await client.query(
        `select * from notification_preferences where workspace_id = $1 and user_id = $2`,
        [workspaceId, targetUserId],
      );
      if (existing.rowCount > 0) {
        const row = existing.rows[0];
        return {
          preferenceId: String(row.preference_id),
          workspaceId,
          userId: targetUserId,
          channels: {
            email: Boolean(row.channel_email),
            inApp: Boolean(row.channel_in_app),
            webhook: Boolean(row.channel_webhook),
          },
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
        };
      }

      const now = new Date().toISOString();
      const created: NotificationPreferenceRecord = {
        preferenceId: `npref_${randomUUID()}`,
        workspaceId,
        userId: targetUserId,
        channels: { email: true, inApp: true, webhook: false },
        createdAt: now,
        updatedAt: now,
      };
      await client.query(
        `insert into notification_preferences (preference_id, workspace_id, user_id, channel_email, channel_in_app, channel_webhook, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          created.preferenceId,
          workspaceId,
          targetUserId,
          created.channels.email,
          created.channels.inApp,
          created.channels.webhook,
          created.createdAt,
          created.updatedAt,
        ],
      );
      return created;
    });
  }

  async listByWorkspace(workspaceId: string): Promise<NotificationPreferenceRecord[]> {
    return withWorkspace(this.pool, workspaceId, async (client) => {
      const result = await client.query(
        `select * from notification_preferences where workspace_id = $1 order by user_id`,
        [workspaceId],
      );
      return result.rows.map((row) => ({
        preferenceId: String(row.preference_id),
        workspaceId: String(row.workspace_id),
        userId: String(row.user_id),
        channels: {
          email: Boolean(row.channel_email),
          inApp: Boolean(row.channel_in_app),
          webhook: Boolean(row.channel_webhook),
        },
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      }));
    });
  }
}

export class PostgresWebhookDeliveryService {
  constructor(private readonly pool: Pool) {}

  async enqueue(
    context: RequestContext,
    input: {
      targetUrl: string;
      eventType: string;
      eventId: string;
      payload: Record<string, unknown>;
      maxAttempts?: number;
    },
  ): Promise<OutboundWebhookDeliveryRecord> {
    const workspaceId = ensureWorkspaceContext(context);

    if (!input.targetUrl.trim()) {
      throw new DomainError("validation_denied", "targetUrl is required", { field: "targetUrl" });
    }
    if (!input.targetUrl.startsWith("http://") && !input.targetUrl.startsWith("https://")) {
      throw new DomainError("validation_denied", "targetUrl must start with http:// or https://", {
        field: "targetUrl",
      });
    }
    if (!input.eventType.trim()) {
      throw new DomainError("validation_denied", "eventType is required", { field: "eventType" });
    }
    if (!input.eventId.trim()) {
      throw new DomainError("validation_denied", "eventId is required", { field: "eventId" });
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

    await withWorkspace(this.pool, workspaceId, async (client) => {
      await client.query(
        `insert into outbound_webhook_deliveries
         (delivery_id, workspace_id, target_url, event_type, event_id, payload, idempotency_key, attempt_count, max_attempts, status, queued_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          delivery.deliveryId,
          delivery.workspaceId,
          delivery.targetUrl,
          delivery.eventType,
          delivery.eventId,
          delivery.payload,
          delivery.idempotencyKey,
          delivery.attemptCount,
          delivery.maxAttempts,
          delivery.status,
          delivery.queuedAt,
          delivery.updatedAt,
        ],
      );
    });

    return delivery;
  }

  async recordAttempt(
    context: RequestContext,
    deliveryId: string,
    input: { success: boolean; errorMessage?: string },
  ): Promise<OutboundWebhookDeliveryRecord> {
    const workspaceId = ensureWorkspaceContext(context);
    return withWorkspace(this.pool, workspaceId, async (client) => {
      const existing = await client.query(
        `select * from outbound_webhook_deliveries where delivery_id = $1 and workspace_id = $2`,
        [deliveryId, workspaceId],
      );
      if (existing.rowCount === 0) {
        throw new DomainError("not_found", "Webhook delivery not found", { deliveryId });
      }

      const row = existing.rows[0];
      const currentStatus = row.status as OutboundWebhookDeliveryStatus;
      if (currentStatus === "delivered") {
        return mapWebhookRow(row);
      }
      if (currentStatus !== "pending" && currentStatus !== "failed") {
        throw new DomainError("conflict", "Delivery cannot be attempted in current state", {
          deliveryId,
          status: currentStatus,
        });
      }

      const attemptCount = Number(row.attempt_count) + 1;
      const now = new Date().toISOString();
      let status: OutboundWebhookDeliveryStatus = currentStatus;
      let nextRetryAt: string | null = null;
      let completedAt: string | null = null;

      if (input.success) {
        status = "delivered";
        completedAt = now;
      } else {
        const exhausted = attemptCount >= Number(row.max_attempts);
        status = exhausted ? "dead_letter" : "failed";
        completedAt = exhausted ? now : null;
        nextRetryAt = exhausted
          ? null
          : new Date(Date.now() + attemptCount * 5_000).toISOString();
      }

      await client.query(
        `update outbound_webhook_deliveries
         set attempt_count = $1,
             status = $2,
             updated_at = $3,
             last_attempt_at = $4,
             next_retry_at = $5,
             completed_at = $6,
             last_error_message = $7
         where delivery_id = $8`,
        [
          attemptCount,
          status,
          now,
          now,
          nextRetryAt,
          completedAt,
          input.errorMessage ? input.errorMessage.trim().slice(0, 500) : null,
          deliveryId,
        ],
      );

      return {
        deliveryId,
        workspaceId,
        targetUrl: String(row.target_url),
        eventType: String(row.event_type),
        eventId: String(row.event_id),
        payload: row.payload as Record<string, unknown>,
        idempotencyKey: String(row.idempotency_key),
        attemptCount,
        maxAttempts: Number(row.max_attempts),
        status,
        queuedAt: String(row.queued_at),
        updatedAt: now,
        lastAttemptAt: now,
        ...(nextRetryAt ? { nextRetryAt } : {}),
        ...(completedAt ? { completedAt } : {}),
        ...(input.errorMessage ? { lastErrorMessage: input.errorMessage.trim().slice(0, 500) } : {}),
      };
    });
  }

  async replay(
    context: RequestContext,
    deliveryId: string,
  ): Promise<OutboundWebhookDeliveryRecord> {
    const workspaceId = ensureWorkspaceContext(context);
    return withWorkspace(this.pool, workspaceId, async (client) => {
      const existing = await client.query(
        `select * from outbound_webhook_deliveries where delivery_id = $1 and workspace_id = $2`,
        [deliveryId, workspaceId],
      );
      if (existing.rowCount === 0) {
        throw new DomainError("not_found", "Webhook delivery not found", { deliveryId });
      }

      const row = existing.rows[0];
      const currentStatus = row.status as OutboundWebhookDeliveryStatus;
      if (currentStatus !== "failed" && currentStatus !== "dead_letter") {
        throw new DomainError("conflict", "Only failed or dead-letter deliveries can be replayed", {
          deliveryId,
          status: currentStatus,
        });
      }

      const now = new Date().toISOString();
      const idempotencyKey = `whk_${row.event_id}_${randomUUID()}`;
      await client.query(
        `update outbound_webhook_deliveries
         set status = $1,
             attempt_count = $2,
             updated_at = $3,
             idempotency_key = $4,
             next_retry_at = null,
             completed_at = null,
             last_error_message = null
         where delivery_id = $5`,
        ["pending", 0, now, idempotencyKey, deliveryId],
      );

      return {
        deliveryId,
        workspaceId,
        targetUrl: String(row.target_url),
        eventType: String(row.event_type),
        eventId: String(row.event_id),
        payload: row.payload as Record<string, unknown>,
        idempotencyKey,
        attemptCount: 0,
        maxAttempts: Number(row.max_attempts),
        status: "pending",
        queuedAt: String(row.queued_at),
        updatedAt: now,
      };
    });
  }

  async listByWorkspace(workspaceId: string): Promise<OutboundWebhookDeliveryRecord[]> {
    return withWorkspace(this.pool, workspaceId, async (client) => {
      const result = await client.query(
        `select * from outbound_webhook_deliveries where workspace_id = $1`,
        [workspaceId],
      );
      return result.rows.map(mapWebhookRow);
    });
  }
}

function mapWebhookRow(row: Record<string, unknown>): OutboundWebhookDeliveryRecord {
  return {
    deliveryId: String(row.delivery_id),
    workspaceId: String(row.workspace_id),
    targetUrl: String(row.target_url),
    eventType: String(row.event_type),
    eventId: String(row.event_id),
    payload: row.payload as Record<string, unknown>,
    idempotencyKey: String(row.idempotency_key),
    attemptCount: Number(row.attempt_count),
    maxAttempts: Number(row.max_attempts),
    status: row.status as OutboundWebhookDeliveryStatus,
    queuedAt: String(row.queued_at),
    updatedAt: String(row.updated_at),
    ...(row.last_attempt_at ? { lastAttemptAt: String(row.last_attempt_at) } : {}),
    ...(row.next_retry_at ? { nextRetryAt: String(row.next_retry_at) } : {}),
    ...(row.completed_at ? { completedAt: String(row.completed_at) } : {}),
    ...(row.last_error_message ? { lastErrorMessage: String(row.last_error_message) } : {}),
  };
}

export class PostgresIngestionService {
  constructor(private readonly pool: Pool, private readonly maxRetries = 3) {}

  async createDocument(
    context: RequestContext,
    input: { name: string; source: string },
  ): Promise<DocumentAsset> {
    const workspaceId = ensureWorkspaceContext(context);

    if (!input.name.trim() || !input.source.trim()) {
      throw new DomainError("validation_denied", "name and source are required", {
        field: "name,source",
      });
    }

    const now = new Date().toISOString();
    const document: DocumentAsset = {
      documentId: `doc_${randomUUID()}`,
      workspaceId,
      name: input.name,
      source: input.source,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    };

    return withWorkspace(this.pool, workspaceId, async (client) => {
      await ensureWorkspaceAndUser(client, {
        workspaceId,
        actorId: context.actorId,
      });

      await client.query(
        `insert into documents (document_id, workspace_id, name, source, status, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          document.documentId,
          document.workspaceId,
          document.name,
          document.source,
          document.status,
          document.createdAt,
          document.updatedAt,
        ],
      );

      await client.query(
        `insert into ingestion_jobs (document_id, attempt_count, retry_count, max_retries, correlation_id, idempotency_key, queued_at)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          document.documentId,
          0,
          0,
          this.maxRetries,
          context.correlationId,
          `idemp_${randomUUID()}`,
          now,
        ],
      );

      await recordEvent(client, {
        eventType: "document.created",
        payload: {
          documentId: document.documentId,
          workspaceId: document.workspaceId,
          status: document.status,
        },
        context,
      });

      return document;
    });
  }

  async markProcessing(context: RequestContext, documentId: string): Promise<DocumentAsset> {
    const workspaceId = ensureWorkspaceContext(context);

    return withWorkspace(this.pool, workspaceId, async (client) => {
      const docResult = await client.query(
        `select * from documents where document_id = $1 and workspace_id = $2`,
        [documentId, workspaceId],
      );

      if (docResult.rowCount === 0) {
        throw new DomainError("not_found", "Document not found", { documentId });
      }

      const current = mapDocumentRow(docResult.rows[0]);
      if (current.status !== "queued" && current.status !== "retrying") {
        throw new DomainError("conflict", "Document is not ready for processing", {
          documentId,
          status: current.status,
        });
      }

      const now = new Date().toISOString();
      await client.query(
        `update ingestion_jobs set attempt_count = attempt_count + 1, started_at = $1 where document_id = $2`,
        [now, documentId],
      );

      await client.query(
        `update documents set status = $1, updated_at = $2 where document_id = $3`,
        ["processing", now, documentId],
      );

      const updated: DocumentAsset = {
        ...current,
        status: "processing",
        updatedAt: now,
      };

      await recordEvent(client, {
        eventType: "document.processing",
        payload: {
          documentId: updated.documentId,
          workspaceId: updated.workspaceId,
          status: updated.status,
        },
        context,
      });

      return updated;
    });
  }

  async markCompleted(
    context: RequestContext,
    documentId: string,
    chunkCount: number,
  ): Promise<DocumentAsset> {
    const workspaceId = ensureWorkspaceContext(context);

    return withWorkspace(this.pool, workspaceId, async (client) => {
      const docResult = await client.query(
        `select * from documents where document_id = $1 and workspace_id = $2`,
        [documentId, workspaceId],
      );

      if (docResult.rowCount === 0) {
        throw new DomainError("not_found", "Document not found", { documentId });
      }

      const current = mapDocumentRow(docResult.rows[0]);
      if (current.status !== "processing") {
        throw new DomainError("conflict", "Only processing documents can complete", {
          documentId,
          status: current.status,
        });
      }

      const now = new Date().toISOString();
      await client.query(
        `update documents set status = $1, updated_at = $2 where document_id = $3`,
        ["completed", now, documentId],
      );

      await client.query(
        `update ingestion_jobs set completed_at = $1, chunk_count = $2 where document_id = $3`,
        [now, chunkCount, documentId],
      );

      const updated: DocumentAsset = {
        ...current,
        status: "completed",
        updatedAt: now,
      };

      await recordEvent(client, {
        eventType: "document.completed",
        payload: {
          documentId: updated.documentId,
          workspaceId: updated.workspaceId,
          status: updated.status,
        },
        context,
      });

      return updated;
    });
  }

  async markFailed(
    context: RequestContext,
    documentId: string,
    errorMessage: string,
    errorClass = "unexpected_internal",
  ): Promise<DocumentAsset> {
    const workspaceId = ensureWorkspaceContext(context);

    return withWorkspace(this.pool, workspaceId, async (client) => {
      const docResult = await client.query(
        `select * from documents where document_id = $1 and workspace_id = $2`,
        [documentId, workspaceId],
      );

      if (docResult.rowCount === 0) {
        throw new DomainError("not_found", "Document not found", { documentId });
      }

      const current = mapDocumentRow(docResult.rows[0]);
      if (current.status !== "processing") {
        throw new DomainError("conflict", "Only processing documents can fail", {
          documentId,
          status: current.status,
        });
      }

      const jobResult = await client.query(
        `select * from ingestion_jobs where document_id = $1`,
        [documentId],
      );
      if (jobResult.rowCount === 0) {
        throw new DomainError("internal_error", "Ingestion job missing", { documentId });
      }

      const job = jobResult.rows[0];
      const retryCount = Number(job.retry_count) + 1;
      const maxRetries = Number(job.max_retries);
      const nextStatus = retryCount > maxRetries ? "dead_letter" : "failed";
      const now = new Date().toISOString();
      const nextRetryAt =
        nextStatus === "failed"
          ? new Date(Date.now() + 1000 * 5 * retryCount).toISOString()
          : null;

      await client.query(
        `update documents set status = $1, updated_at = $2 where document_id = $3`,
        [nextStatus, now, documentId],
      );

      await client.query(
        `update ingestion_jobs
         set retry_count = $1,
             last_error_class = $2,
             last_error_message = $3,
             next_retry_at = $4,
             completed_at = $5
         where document_id = $6`,
        [
          retryCount,
          errorClass,
          String(errorMessage).slice(0, 500),
          nextRetryAt,
          nextStatus === "dead_letter" ? now : null,
          documentId,
        ],
      );

      const updated: DocumentAsset = {
        ...current,
        status: nextStatus as DocumentAsset["status"],
        updatedAt: now,
      };

      await recordEvent(client, {
        eventType: nextStatus === "dead_letter" ? "document.dead_letter" : "document.failed",
        payload: {
          documentId: updated.documentId,
          workspaceId: updated.workspaceId,
          status: updated.status,
        },
        context,
      });

      return updated;
    });
  }

  async retry(
    context: RequestContext,
    documentId: string,
    options?: { replayDeadLetter?: boolean; correlationId?: string },
  ): Promise<DocumentAsset> {
    const workspaceId = ensureWorkspaceContext(context);

    return withWorkspace(this.pool, workspaceId, async (client) => {
      const docResult = await client.query(
        `select * from documents where document_id = $1 and workspace_id = $2`,
        [documentId, workspaceId],
      );

      if (docResult.rowCount === 0) {
        throw new DomainError("not_found", "Document not found", { documentId });
      }

      const current = mapDocumentRow(docResult.rows[0]);
      const isReplay = current.status === "dead_letter";
      if (isReplay && !options?.replayDeadLetter) {
        throw new DomainError("unavailable", "Document is dead-lettered; replay required", {
          documentId,
        });
      }

      if (current.status !== "failed" && current.status !== "dead_letter") {
        throw new DomainError("conflict", "Document is not retryable", {
          documentId,
          status: current.status,
        });
      }

      const jobResult = await client.query(
        `select * from ingestion_jobs where document_id = $1`,
        [documentId],
      );
      if (jobResult.rowCount === 0) {
        throw new DomainError("internal_error", "Ingestion job missing", { documentId });
      }

      const job = jobResult.rows[0];
      const retryCount = isReplay ? 0 : Number(job.retry_count);
      const attemptCount = isReplay ? 0 : Number(job.attempt_count);
      const maxRetries = Number(job.max_retries);

      if (!isReplay && retryCount > maxRetries) {
        throw new DomainError("unavailable", "Retry limit exceeded", { documentId });
      }

      const now = new Date().toISOString();
      await client.query(
        `update ingestion_jobs
         set attempt_count = $1,
             retry_count = $2,
             correlation_id = $3,
             idempotency_key = $4,
             queued_at = $5,
             started_at = null,
             completed_at = null,
             next_retry_at = null
         where document_id = $6`,
        [
          attemptCount,
          retryCount,
          options?.correlationId ?? context.correlationId,
          `idemp_${randomUUID()}`,
          now,
          documentId,
        ],
      );

      await client.query(
        `update documents set status = $1, updated_at = $2 where document_id = $3`,
        ["retrying", now, documentId],
      );

      const updated: DocumentAsset = {
        ...current,
        status: "retrying",
        updatedAt: now,
      };

      await recordEvent(client, {
        eventType: "document.retrying",
        payload: {
          documentId: updated.documentId,
          workspaceId: updated.workspaceId,
          status: updated.status,
        },
        context,
      });

      return updated;
    });
  }

  async listByWorkspace(workspaceId: string): Promise<DocumentAsset[]> {
    return withWorkspace(this.pool, workspaceId, async (client) => {
      const result = await client.query(`select * from documents where workspace_id = $1`, [
        workspaceId,
      ]);
      return result.rows.map(mapDocumentRow);
    });
  }

  async getActivity(context: RequestContext, documentId: string): Promise<DocumentEvent[]> {
    const workspaceId = ensureWorkspaceContext(context);
    return withWorkspace(this.pool, workspaceId, async (client) => {
      const result = await client.query(
        `select event_id, event_type, payload, correlation_id, occurred_at, workspace_id, actor_id, version
         from events
         where workspace_id = $1 and payload ->> 'documentId' = $2
         order by occurred_at desc`,
        [workspaceId, documentId],
      );

      return result.rows.map((row) => ({
        eventId: String(row.event_id),
        eventType: row.event_type,
        occurredAt: String(row.occurred_at),
        correlationId: String(row.correlation_id),
        version: row.version,
        payload: row.payload,
        ...(row.workspace_id ? { workspaceId: row.workspace_id } : {}),
        ...(row.actor_id ? { actorId: row.actor_id } : {}),
      })) as DocumentEvent[];
    });
  }
}

export class PostgresRetrievalService {
  constructor(private readonly pool: Pool) {}

  async indexChunks(
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
  ): Promise<
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
  > {
    const workspaceId = ensureWorkspaceContext(context);

    if (!input.documentId.trim()) {
      throw new DomainError("validation_denied", "documentId is required", {
        field: "documentId",
      });
    }

    if (input.chunks.length === 0) {
      throw new DomainError("validation_denied", "chunks are required", {
        field: "chunks",
      });
    }

    return withWorkspace(this.pool, workspaceId, async (client) => {
      await ensureWorkspaceAndUser(client, {
        workspaceId,
        actorId: context.actorId,
      });

      const documentResult = await client.query(
        `select workspace_id from documents where document_id = $1`,
        [input.documentId],
      );

      if (documentResult.rowCount > 0) {
        const documentWorkspaceId = String(documentResult.rows[0]?.workspace_id ?? "");
        if (documentWorkspaceId && documentWorkspaceId !== workspaceId) {
          throw new DomainError("conflict", "Document belongs to another workspace", {
            documentId: input.documentId,
          });
        }
      } else {
        const now = new Date().toISOString();
        await client.query(
          `insert into documents (document_id, workspace_id, name, source, status, created_at, updated_at)
           values ($1, $2, $3, $4, $5, $6, $7)
           on conflict (document_id) do nothing`,
          [
            input.documentId,
            workspaceId,
            input.sourceTitle,
            input.sourceUri,
            "completed",
            now,
            now,
          ],
        );
      }

      const indexed = await Promise.all(
        input.chunks.map(async (chunk) => {
          if (!chunk.text.trim()) {
            throw new DomainError("validation_denied", "chunk text is required", {
              field: "chunks.text",
            });
          }

          const indexedAt = chunk.indexedAt ?? new Date().toISOString();
          const chunkId = chunk.chunkId ?? `chk_${randomUUID()}`;

          await client.query(
            `insert into document_chunks (
              chunk_id,
              workspace_id,
              document_id,
              source_uri,
              source_title,
              content,
              chunk_start_offset,
              chunk_end_offset,
              embedding_model_version,
              embedding,
              indexed_at
            ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            on conflict (chunk_id) do update set
              workspace_id = excluded.workspace_id,
              document_id = excluded.document_id,
              source_uri = excluded.source_uri,
              source_title = excluded.source_title,
              content = excluded.content,
              chunk_start_offset = excluded.chunk_start_offset,
              chunk_end_offset = excluded.chunk_end_offset,
              embedding_model_version = excluded.embedding_model_version,
              embedding = excluded.embedding,
              indexed_at = excluded.indexed_at`,
            [
              chunkId,
              workspaceId,
              input.documentId,
              input.sourceUri,
              input.sourceTitle,
              chunk.text,
              chunk.chunkStartOffset,
              chunk.chunkEndOffset,
              input.embeddingModelVersion,
              null,
              indexedAt,
            ],
          );

          return {
            chunkId,
            workspaceId,
            documentId: input.documentId,
            sourceUri: input.sourceUri,
            sourceTitle: input.sourceTitle,
            text: chunk.text,
            chunkStartOffset: chunk.chunkStartOffset,
            chunkEndOffset: chunk.chunkEndOffset,
            embeddingModelVersion: input.embeddingModelVersion,
            indexedAt,
          };
        }),
      );

      return indexed;
    });
  }

  async query(
    context: RequestContext,
    input: {
      query: string;
      method?: RetrievalMethod;
      limit?: number;
      minScore?: number;
    },
  ): Promise<RetrievalResultItem[]> {
    const workspaceId = ensureWorkspaceContext(context);

    if (!input.query.trim()) {
      throw new DomainError("validation_denied", "query is required", {
        field: "query",
      });
    }

    const method: RetrievalMethod = input.method ?? "hybrid";
    const limit = Math.max(1, input.limit ?? 5);
    const minScore = input.minScore ?? 0;
    const fetchLimit = Math.max(limit * 4, limit);

    return withWorkspace(this.pool, workspaceId, async (client) => {
      const result = await client.query(
        `select
          chunk_id,
          document_id,
          source_uri,
          source_title,
          chunk_start_offset,
          chunk_end_offset,
          embedding_model_version,
          indexed_at,
          ts_rank_cd(to_tsvector('english', content), plainto_tsquery('english', $1)) as rank
         from document_chunks
         where workspace_id = $2
         order by rank desc, indexed_at desc
         limit $3`,
        [input.query, workspaceId, fetchLimit],
      );

      type RetrievalCandidate = {
        workspaceId: string;
        documentId: string;
        chunkId: string;
        sourceUri: string;
        sourceTitle: string;
        chunkStartOffset: number;
        chunkEndOffset: number;
        retrievalScore: number;
        embeddingModelVersion: string;
        indexedAt: string;
      };

      const scored = result.rows
        .map((row: Record<string, unknown>): RetrievalCandidate => {
          const rawScore = Number(row.rank ?? 0);
          const retrievalScore = Math.max(0, Math.min(1, rawScore));

          return {
            workspaceId,
            documentId: String(row.document_id),
            chunkId: String(row.chunk_id),
            sourceUri: String(row.source_uri),
            sourceTitle: String(row.source_title),
            chunkStartOffset: Number(row.chunk_start_offset),
            chunkEndOffset: Number(row.chunk_end_offset),
            retrievalScore,
            embeddingModelVersion: String(row.embedding_model_version),
            indexedAt: String(row.indexed_at),
          };
        })
        .filter((candidate: RetrievalCandidate) => candidate.retrievalScore >= minScore)
        .slice(0, limit);

      return scored.map((candidate: RetrievalCandidate, index: number) => ({
        ...candidate,
        retrievalRank: index + 1,
        retrievalMethod: method,
        correlationId: context.correlationId,
      }));
    });
  }

  async recordCitation(
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
  ): Promise<CitationProvenance> {
    const workspaceId = ensureWorkspaceContext(context);

    return withWorkspace(this.pool, workspaceId, async (client) => {
      const chunkResult = await client.query(
        `select chunk_id from document_chunks where chunk_id = $1 and workspace_id = $2`,
        [input.chunkId, workspaceId],
      );

      if (chunkResult.rowCount === 0) {
        throw new DomainError("not_found", "Chunk not found in workspace", {
          chunkId: input.chunkId,
        });
      }

      const normalizedScore = Math.max(0, Math.min(1, input.confidenceScore));
      const confidenceBand = input.confidenceBand ?? this.scoreToBand(normalizedScore);
      const citationId = input.citationId ?? `cite_${randomUUID()}`;
      const createdAt = new Date().toISOString();

      await client.query(
        `insert into retrieval_citations (
          citation_id,
          workspace_id,
          agent_run_id,
          response_segment_id,
          document_id,
          chunk_id,
          evidence_type,
          confidence_score,
          confidence_band,
          created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          citationId,
          workspaceId,
          input.agentRunId,
          input.responseSegmentId,
          input.documentId,
          input.chunkId,
          input.evidenceType,
          normalizedScore,
          confidenceBand,
          createdAt,
        ],
      );

      return {
        citationId,
        agentRunId: input.agentRunId,
        responseSegmentId: input.responseSegmentId,
        documentId: input.documentId,
        chunkId: input.chunkId,
        evidenceType: input.evidenceType,
        confidenceScore: normalizedScore,
        confidenceBand,
        workspaceId,
      };
    });
  }

  async listCitations(
    context: RequestContext,
    agentRunId?: string,
  ): Promise<CitationProvenance[]> {
    const workspaceId = ensureWorkspaceContext(context);

    return withWorkspace(this.pool, workspaceId, async (client) => {
      const result = await client.query(
        `select
          citation_id,
          agent_run_id,
          response_segment_id,
          document_id,
          chunk_id,
          evidence_type,
          confidence_score,
          confidence_band,
          workspace_id
         from retrieval_citations
         where workspace_id = $1
           and ($2::text is null or agent_run_id = $2)
         order by created_at desc`,
        [workspaceId, agentRunId ?? null],
      );

      return result.rows.map((row: Record<string, unknown>) => ({
        citationId: String(row.citation_id),
        agentRunId: String(row.agent_run_id),
        responseSegmentId: String(row.response_segment_id),
        documentId: String(row.document_id),
        chunkId: String(row.chunk_id),
        evidenceType: row.evidence_type as EvidenceType,
        confidenceScore: Number(row.confidence_score),
        confidenceBand: row.confidence_band as ConfidenceBand,
        workspaceId: String(row.workspace_id),
      }));
    });
  }

  private scoreToBand(score: number): ConfidenceBand {
    if (score >= 0.8) {
      return "high";
    }

    if (score >= 0.5) {
      return "medium";
    }

    return "low";
  }
}

export class PostgresAgentRuntimeService {
  private readonly runtime: InMemoryAgentRuntimeService;

  constructor(
    private readonly pool: Pool,
    registry: InMemoryToolRegistry,
  ) {
    this.runtime = new InMemoryAgentRuntimeService(registry);
  }

  async execute(
    context: RequestContext,
    input: {
      toolName: string;
      toolInput: unknown;
      confirmHighRiskAction?: boolean;
      threadId?: string;
    },
  ): Promise<{ run: AgentRunRecord; toolCall: ToolCallRecord; output?: unknown }> {
    const result = await this.runtime.execute(context, input);
    await this.persistRun(context, result.run);
    await this.persistToolCall(context, result.toolCall);
    return result;
  }

  async listRuns(workspaceId?: string): Promise<AgentRunRecord[]> {
    if (!workspaceId) {
      return [];
    }

    return withWorkspace(this.pool, workspaceId, async (client) => {
      const result = await client.query(
        `select
          run_id,
          workspace_id,
          thread_id,
          actor_id,
          status,
          model_name,
          model_version,
          prompt_version,
          moderation_outcome,
          input_tokens,
          output_tokens,
          estimated_cost_usd,
          started_at,
          completed_at,
          error_class,
          correlation_id
         from agent_runs
         where workspace_id = $1
         order by started_at desc`,
        [workspaceId],
      );

      return result.rows.map((row: Record<string, unknown>) => ({
        runId: String(row.run_id),
        workspaceId: String(row.workspace_id),
        ...(row.thread_id ? { threadId: String(row.thread_id) } : {}),
        ...(row.actor_id ? { actorId: String(row.actor_id) } : {}),
        correlationId: String(row.correlation_id),
        modelName: String(row.model_name),
        modelVersion: String(row.model_version),
        promptVersion: String(row.prompt_version),
        status: row.status as AgentRunRecord["status"],
        startedAt: String(row.started_at),
        ...(row.completed_at ? { completedAt: String(row.completed_at) } : {}),
        ...(row.error_class ? { errorClass: row.error_class as AgentRunRecord["errorClass"] } : {}),
        ...(row.moderation_outcome
          ? { moderationOutcome: row.moderation_outcome as AgentRunRecord["moderationOutcome"] }
          : {}),
        inputTokens: Number(row.input_tokens),
        outputTokens: Number(row.output_tokens),
        estimatedCostUsd: Number(row.estimated_cost_usd),
      }));
    });
  }

  async listToolCalls(workspaceId?: string): Promise<ToolCallRecord[]> {
    if (!workspaceId) {
      return [];
    }

    return withWorkspace(this.pool, workspaceId, async (client) => {
      const result = await client.query(
        `select
          tool_call_id,
          run_id,
          workspace_id,
          actor_id,
          tool_name,
          tool_version,
          status,
          policy_decision,
          attempt_count,
          idempotency_key,
          started_at,
          completed_at,
          error_class,
          correlation_id
         from tool_calls
         where workspace_id = $1
         order by started_at desc`,
        [workspaceId],
      );

      return result.rows.map((row: Record<string, unknown>) => ({
        toolCallId: String(row.tool_call_id),
        runId: String(row.run_id),
        workspaceId: String(row.workspace_id),
        ...(row.actor_id ? { actorId: String(row.actor_id) } : {}),
        correlationId: String(row.correlation_id),
        toolName: String(row.tool_name),
        toolVersion: String(row.tool_version),
        stepIndex: 0,
        idempotencyKey: String(row.idempotency_key),
        policyDecision: row.policy_decision as ToolCallRecord["policyDecision"],
        status: row.status as ToolCallRecord["status"],
        attemptCount: Number(row.attempt_count),
        startedAt: String(row.started_at),
        ...(row.completed_at ? { completedAt: String(row.completed_at) } : {}),
        ...(row.error_class ? { errorClass: row.error_class as ToolCallRecord["errorClass"] } : {}),
      }));
    });
  }

  async listToolCallsByRun(runId: string, workspaceId?: string): Promise<ToolCallRecord[]> {
    if (!workspaceId) {
      return [];
    }

    const toolCalls = await this.listToolCalls(workspaceId);
    return toolCalls.filter((call) => call.runId === runId);
  }

  private async persistRun(context: RequestContext, run: AgentRunRecord): Promise<void> {
    const workspaceId = ensureWorkspaceContext(context);
    await withWorkspace(this.pool, workspaceId, async (client) => {
      await ensureWorkspaceAndUser(client, {
        workspaceId,
        ...(context.actorId ? { actorId: context.actorId } : {}),
      });

      await client.query(
        `insert into agent_runs (
          run_id,
          workspace_id,
          thread_id,
          actor_id,
          status,
          model_name,
          model_version,
          prompt_version,
          moderation_outcome,
          input_tokens,
          output_tokens,
          estimated_cost_usd,
          started_at,
          completed_at,
          error_class,
          correlation_id
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        on conflict (run_id) do update set
          status = excluded.status,
          moderation_outcome = excluded.moderation_outcome,
          input_tokens = excluded.input_tokens,
          output_tokens = excluded.output_tokens,
          estimated_cost_usd = excluded.estimated_cost_usd,
          completed_at = excluded.completed_at,
          error_class = excluded.error_class`,
        [
          run.runId,
          run.workspaceId,
          run.threadId ?? null,
          run.actorId ?? null,
          run.status,
          run.modelName,
          run.modelVersion,
          run.promptVersion,
          run.moderationOutcome ?? null,
          run.inputTokens,
          run.outputTokens,
          run.estimatedCostUsd,
          run.startedAt,
          run.completedAt ?? null,
          run.errorClass ?? null,
          run.correlationId,
        ],
      );
    });
  }

  private async persistToolCall(
    context: RequestContext,
    toolCall: ToolCallRecord,
  ): Promise<void> {
    const workspaceId = ensureWorkspaceContext(context);
    await withWorkspace(this.pool, workspaceId, async (client) => {
      await ensureWorkspaceAndUser(client, {
        workspaceId,
        ...(context.actorId ? { actorId: context.actorId } : {}),
      });

      await client.query(
        `insert into tool_calls (
          tool_call_id,
          run_id,
          workspace_id,
          actor_id,
          tool_name,
          tool_version,
          status,
          policy_decision,
          attempt_count,
          idempotency_key,
          started_at,
          completed_at,
          error_class,
          correlation_id
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        on conflict (tool_call_id) do update set
          status = excluded.status,
          policy_decision = excluded.policy_decision,
          attempt_count = excluded.attempt_count,
          completed_at = excluded.completed_at,
          error_class = excluded.error_class`,
        [
          toolCall.toolCallId,
          toolCall.runId,
          toolCall.workspaceId,
          toolCall.actorId ?? null,
          toolCall.toolName,
          toolCall.toolVersion,
          toolCall.status,
          toolCall.policyDecision,
          toolCall.attemptCount,
          toolCall.idempotencyKey,
          toolCall.startedAt,
          toolCall.completedAt ?? null,
          toolCall.errorClass ?? null,
          toolCall.correlationId,
        ],
      );
    });
  }
}

export class PostgresBillingService {
  private readonly billing = new InMemoryBillingService();

  constructor(private readonly pool: Pool) {}

  reconcileWebhook(input: {
    sourceEventId: string;
    workspaceId: string;
    type:
      | "subscription.activated"
      | "subscription.changed"
      | "subscription.canceled"
      | "invoice.payment_failed";
    planId?: string;
  }) {
    return this.billing.reconcileWebhook(input);
  }

  setEntitlementPolicy(policy: {
    planId: string;
    features: Record<string, boolean>;
    quotas: Record<string, number>;
  }): void {
    this.billing.setEntitlementPolicy(policy);
  }

  async recordUsage(
    workspaceId: string,
    metric: string,
    amount = 1,
    options?: { idempotencyKey?: string; correlationId?: string },
  ): Promise<void> {
    this.billing.recordUsage(workspaceId, metric, amount, options);
    const counter = this.billing.getUsageCounter(workspaceId, metric);

    if (!counter) {
      return;
    }

    await withWorkspace(this.pool, workspaceId, async (client) => {
      await client.query(
        `insert into usage_counters (
          counter_id,
          workspace_id,
          metric,
          consumed_units,
          counter_version,
          last_increment_at
        ) values ($1, $2, $3, $4, $5, $6)
        on conflict (counter_id) do update set
          consumed_units = excluded.consumed_units,
          counter_version = excluded.counter_version,
          last_increment_at = excluded.last_increment_at`,
        [
          `ctr_${workspaceId}_${metric}`,
          workspaceId,
          metric,
          counter.consumedUnits,
          counter.counterVersion,
          counter.lastIncrementAt,
        ],
      );
    });
  }

  checkQuota(workspaceId: string, metric: string): { allowed: boolean; remaining: number } {
    return this.billing.checkQuota(workspaceId, metric);
  }

  checkFeature(workspaceId: string, feature: string): boolean {
    return this.billing.checkFeature(workspaceId, feature);
  }

  getUiStatus(workspaceId: string): string {
    return this.billing.getUiStatus(workspaceId);
  }

  async recordAnalyticsEvent(input: {
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
  }): Promise<AnalyticsEventRecord> {
    const event = this.billing.recordAnalyticsEvent(input);
    await withWorkspace(this.pool, input.workspaceId, async (client) => {
      await client.query(
        `insert into analytics_events (event_id, workspace_id, event_name, payload, recorded_at)
         values ($1, $2, $3, $4, $5)
         on conflict (event_id) do nothing`,
        [
          event.analyticsEventId,
          event.workspaceId,
          event.eventName,
          JSON.stringify({
            eventVersion: event.eventVersion,
            occurredAt: event.occurredAt,
            actorId: event.actorId,
            correlationId: event.correlationId,
            planId: event.planId,
            entitlementSnapshot: event.entitlementSnapshot,
            payloadValidationStatus: event.payloadValidationStatus,
            payload: (event as { payload?: Record<string, unknown> }).payload ?? {},
          }),
          event.occurredAt,
        ],
      );
    });

    return event;
  }

  async listAnalyticsEvents(workspaceId?: string): Promise<AnalyticsEventRecord[]> {
    if (!workspaceId) {
      return [];
    }

    return withWorkspace(this.pool, workspaceId, async (client) => {
      const result = await client.query(
        `select event_id, workspace_id, event_name, payload, recorded_at
         from analytics_events
         where workspace_id = $1
         order by recorded_at desc`,
        [workspaceId],
      );

      return result.rows.map((row: Record<string, unknown>) => {
        const payload = (row.payload ?? {}) as Record<string, unknown>;
        const entitlementSnapshot = payload.entitlementSnapshot as EntitlementSnapshot;

        return {
          analyticsEventId: String(row.event_id),
          workspaceId: String(row.workspace_id),
          eventName: String(row.event_name),
          eventVersion: String(payload.eventVersion ?? "1.0.0"),
          occurredAt: String(payload.occurredAt ?? row.recorded_at),
          ...(payload.actorId ? { actorId: String(payload.actorId) } : {}),
          correlationId: String(payload.correlationId ?? ""),
          planId: String(payload.planId ?? "free"),
          entitlementSnapshot,
          payloadValidationStatus: payload.payloadValidationStatus as AnalyticsPayloadValidationStatus,
        };
      });
    });
  }

  listIntegrityAnomalies(workspaceId?: string): EntitlementIntegrityAnomaly[] {
    return this.billing.listIntegrityAnomalies(workspaceId);
  }
}
