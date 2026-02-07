# Sprint 10 Entitlement, Usage, and Analytics Consistency Contract

Date: 2026-02-07
Owner: Data Platform Engineer
Consumers: Backend, Frontend, DevOps/SRE, Security/Compliance, QA/Release

## Scope

Supports `F7-E2-S1`, `F7-E2-S2`, `F7-E3-S1`, and beta readiness gate.

## Entitlement Contract

Required fields:

- `workspace_id`
- `plan_id`
- `feature_key`
- `entitlement_status` (`enabled`, `disabled`, `grace`)
- `effective_at`
- `expires_at`
- `override_source` (nullable)
- `updated_by_actor_id`
- `version`

## Usage Counter Contract

Required fields:

- `workspace_id`
- `quota_key`
- `period_start`
- `period_end`
- `consumed_units`
- `limit_units`
- `last_increment_at`
- `last_increment_correlation_id`
- `counter_version`

Counter rules:

1. Increments are atomic.
2. Counter writes are idempotent for replayed usage events.
3. Reset behavior follows period boundaries with explicit audit entry.

## Analytics Event Integrity Contract

Required fields:

- `workspace_id`
- `event_name`
- `event_version`
- `occurred_at`
- `actor_id`
- `correlation_id`
- `plan_id`
- `entitlement_snapshot`
- `payload_validation_status`

## Consistency Guarantees

1. Entitlement state and usage counter checks must evaluate from same effective period window.
2. Analytics events must carry the entitlement snapshot used at decision time.
3. Any mismatch between enforcement and analytics snapshot raises integrity anomaly event.

## Beta Readiness Evidence

1. Counter correctness test suite (positive + replay + race conditions).
2. Entitlement state transition consistency test suite.
3. Analytics payload validation completeness checks.
4. Recovery/rollback notes for counter or entitlement regressions.
