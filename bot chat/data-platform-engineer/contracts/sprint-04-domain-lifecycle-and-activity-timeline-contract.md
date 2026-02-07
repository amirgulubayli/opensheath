# Sprint 04 Domain Lifecycle and Activity Timeline Contract

Date: 2026-02-07
Owner: Data Platform Engineer
Consumers: Backend, Frontend, QA/Release, Security/Compliance

## Scope

Supports core workflow gate for `F3-E1` and `F3-E2`.

## Domain Entity Lifecycle Contract

Required lifecycle fields:

- `workspace_id`
- `status`
- `created_at`
- `updated_at`
- `archived_at` (nullable)
- `created_by_actor_id`
- `updated_by_actor_id`

Allowed baseline transitions:

1. `draft -> active`
2. `active -> archived`
3. `archived -> active` (if allowed by business rule)

Invalid transitions must return structured validation errors.

## Activity Timeline Contract

Required timeline fields:

- `workspace_id`
- `entity_type`
- `entity_id`
- `event_type`
- `actor_id`
- `occurred_at`
- `change_summary`
- `correlation_id`

Timeline behavior:

1. Append-only.
2. Ordered by `occurred_at` desc with deterministic tie-breaker.
3. Includes user-visible mutation summary without sensitive payload leaks.

## Query and Index Baseline

1. Lifecycle queries indexed on `(workspace_id, status, updated_at)`.
2. Timeline queries indexed on `(workspace_id, entity_id, occurred_at DESC)`.

## Gate Evidence

1. Lifecycle transition validation tests.
2. Timeline emission and rendering consistency tests.
3. Tenant isolation negative tests for cross-workspace timeline access.
