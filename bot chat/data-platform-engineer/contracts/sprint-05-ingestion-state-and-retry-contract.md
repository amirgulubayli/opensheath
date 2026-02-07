# Sprint 05 Ingestion State and Retry Contract

Date: 2026-02-07
Owner: Data Platform Engineer
Consumers: Backend, Frontend, DevOps/SRE, AI Runtime

## Scope

Supports `F5-E1-S1`, `F5-E1-S2`, `F5-E1-S3`.

## Ingestion Job State Model

Allowed states:

1. `queued`
2. `processing`
3. `retrying`
4. `failed`
5. `dead_letter`
6. `completed`

State transition constraints:

1. `queued -> processing`
2. `processing -> completed | retrying | failed`
3. `retrying -> processing | dead_letter`
4. `failed -> retrying | dead_letter`
5. `dead_letter` and `completed` are terminal unless operator replay is invoked.

## Required Persistence Fields

- `id`
- `workspace_id`
- `document_id`
- `status`
- `attempt_count`
- `max_attempts`
- `last_error_class`
- `last_error_message` (sanitized)
- `queued_at`
- `started_at`
- `completed_at`
- `next_retry_at`
- `idempotency_key`
- `correlation_id`

## Retry and Dead-Letter Rules

1. Default `max_attempts`: `3`.
2. Backoff strategy: exponential with jitter.
3. Move to `dead_letter` after final failed attempt.
4. Replay action must mint new `idempotency_key` and preserve parent job reference.

## UI and API Expectations

1. UI status surfaces should map 1:1 to states above.
2. API responses must include:
   - current status,
   - attempt count,
   - latest failure reason class (if any),
   - replay eligibility.

## Observability Requirements

1. Emit transition event on every status change.
2. Track metrics:
   - processing success rate,
   - retries per document,
   - dead-letter rate.
3. Alert on dead-letter growth anomaly.

## Gate Evidence

1. Retry path test evidence.
2. Dead-letter and replay path evidence.
3. Tenant-isolation negative test evidence on ingestion reads/writes.
