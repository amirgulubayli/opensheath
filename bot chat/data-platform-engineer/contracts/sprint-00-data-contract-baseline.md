# Sprint 00 Data Contract Baseline

Date: 2026-02-07
Owner: Data Platform Engineer
Gate: Architecture gate

## Purpose

Define baseline rules for schema, migration, and event durability before feature implementation begins.

## Schema Rules

1. Every tenant-owned table includes `workspace_id` (not nullable) and scoped indexes.
2. Every mutable domain table includes `created_at`, `updated_at`, and actor metadata where applicable.
3. Soft-delete fields are default for user-facing entities unless legal retention requires hard delete.

## Migration Rules

1. Migration files are ordered and immutable after merge.
2. Every migration includes:
   - forward change intent,
   - rollback plan,
   - affected consumers.
3. High-risk migrations require staging rehearsal notes before production merge.

## Event Envelope Baseline

All persisted events include:

- `event_id`
- `event_type`
- `occurred_at`
- `workspace_id` (when tenant scoped)
- `actor_id` (if known)
- `correlation_id`
- `version`
- `payload`

## Idempotency Baseline

1. Webhook and external event writes dedupe by `(source, source_event_id)`.
2. Internal retry-safe operations persist `idempotency_key`.
3. Duplicate events must produce no additional side effects.

## Index Baseline

1. High-volume tenant tables include `(workspace_id, created_at)` composite index.
2. Retrieval/vector tables include model-version-aware index strategy.
3. Any new index includes expected query use-case and rollback note.

## Architecture Gate Evidence Checklist

1. Baseline rules published.
2. Dependency asks sent to backend/devops/security/qa.
3. Risk register entries updated for migration and tenancy risks.
