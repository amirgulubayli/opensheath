# Data and Event Architecture

## Purpose

Define the canonical data model, ownership boundaries, and event contracts that keep internal integrations coherent.

## Data Domains

## Identity and Access

- `users`
- `workspaces`
- `workspace_memberships`
- `roles` (if explicit table is used)

## Product Domain

- `projects`
- `items` (or your core domain object)
- `documents`
- `activity_logs`

## AI and Knowledge

- `document_chunks`
- `embeddings`
- `agent_threads`
- `agent_runs`
- `tool_calls`

## Integration and Demo Governance

- `integrations`
- `integration_events`
- `demo_access_states`
- `usage_policies`
- `usage_counters`

## Operational and Compliance

- `audit_logs`
- `job_runs`
- `dead_letter_jobs`

## Data Ownership Rules

- Every tenant-owned row includes `workspace_id`.
- Every privileged write emits an `audit_log` entry.
- Soft delete is default for user-facing domain records unless legal/compliance needs hard delete.
- Access lifecycle and usage policy state is synchronized from deterministic lifecycle events.

## Event Taxonomy

### Domain Events

- `workspace.created`
- `membership.added`
- `project.created`
- `item.updated`
- `document.ingested`

### Integration Events

- `integration.connected`
- `integration.sync_failed`
- `webhook.received`

### Access Lifecycle Events

- `access.activated`
- `access.changed`
- `access.deactivated`
- `usage.limit_reached`

### AI Events

- `agent.run.started`
- `agent.tool.called`
- `agent.run.completed`
- `agent.run.failed`

## Event Envelope Contract

Every event should include:

- `event_id` (globally unique),
- `event_type`,
- `occurred_at`,
- `workspace_id` (if tenant scoped),
- `actor_id` (if user or system actor known),
- `correlation_id` (request-level trace),
- `payload` (typed data),
- `version` (schema version for compatibility).

## Idempotency Standards

- Webhook/event ingestion enforces dedupe by `(source, source_event_id)`.
- Job handlers enforce idempotency by operation key.
- Retries must be safe on repeated execution.

## Retention Policy Blueprint

- Audit logs: long-term retention.
- Debug logs: short-to-medium retention with aggregated metrics retained longer.
- AI run artifacts: retention based on policy and plan tier.
