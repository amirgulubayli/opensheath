# Sprint 08 Event Envelope and Idempotency Contract

Date: 2026-02-07
Owner: Data Platform Engineer
Consumers: Backend, DevOps/SRE, Security/Compliance, QA/Release

## Scope

Supports `F6-E2-S1`, `F6-E2-S2`, `F6-E2-S3` and Sprint 09 billing/webhook safety prerequisites.

## Canonical Event Envelope (Persisted)

- `event_id`
- `event_type`
- `event_version`
- `source_system`
- `source_event_id`
- `workspace_id` (nullable only for global system events)
- `actor_id`
- `occurred_at`
- `received_at`
- `correlation_id`
- `payload`
- `signature_verified` (for webhook-origin events)
- `ingestion_status`

## Idempotency Contract

1. Primary dedupe key:
   - `(source_system, source_event_id)`.
2. Internal action dedupe key:
   - `idempotency_key` per side-effecting consumer action.
3. Duplicate event behavior:
   - mark as duplicate,
   - skip side effects,
   - retain audit metadata.

## Retry and Dead-Letter Fields

- `attempt_count`
- `max_attempts`
- `next_retry_at`
- `last_error_class`
- `dead_lettered_at`
- `dead_letter_reason`

## Security Requirements

1. Webhook events require `signature_verified = true` before mutation.
2. Replay attacks mitigated by dedupe + timestamp tolerance in consumer validation.
3. Sensitive payload segments must be redacted in logs.

## Observability Requirements

1. Metrics:
   - duplicate event rate,
   - retry rate,
   - dead-letter rate,
   - signature verification failure rate.
2. Traceability:
   - every event linked via `correlation_id` to producer and consumer actions.

## Gate Evidence

1. Duplicate event suppression test evidence.
2. Replay safety and dead-letter path evidence.
3. Signature verification enforcement evidence for webhook-origin events.
