# Sprint 09 Billing Sync and Webhook Reconciliation Contract

Date: 2026-02-07
Owner: Data Platform Engineer
Consumers: Backend, DevOps/SRE, Security/Compliance, Frontend, QA/Release

## Scope

Supports `F7-E1-S1`, `F7-E1-S2`, `F7-E1-S3`, and billing sync gate readiness.

## Subscription State Mirror Contract

Required fields:

- `workspace_id`
- `provider_customer_id`
- `provider_subscription_id`
- `plan_id`
- `status` (`trialing`, `active`, `past_due`, `canceled`, `incomplete`)
- `current_period_start`
- `current_period_end`
- `cancel_at_period_end`
- `last_synced_at`
- `source_event_id`
- `correlation_id`

## Webhook Event Persistence Contract

Required fields:

- `source_system`
- `source_event_id`
- `event_type`
- `signature_verified`
- `received_at`
- `processed_at`
- `processing_status`
- `attempt_count`
- `last_error_class`
- `idempotency_key`

## Reconciliation Rules

1. Source of truth is provider webhook event stream.
2. Duplicate webhook events are deduped by `(source_system, source_event_id)`.
3. Out-of-order events must be safely replayable using event timestamp/version ordering rules.
4. Failed events transition to retry and dead-letter paths with operator replay support.

## Security Requirements

1. Signature validation required before state mutation.
2. Unverified webhooks are persisted as rejected for audit but cannot mutate billing state.
3. Sensitive billing payload fields are redacted in logs.

## UI-Visible Status Contract

Frontend-facing status set:

1. `active`
2. `trialing`
3. `past_due`
4. `payment_failed`
5. `canceled`
6. `pending_sync`

## Gate Evidence

1. Duplicate and out-of-order webhook replay tests.
2. Signature verification enforcement tests.
3. Subscription mirror consistency tests across retries.
4. Billing status mapping validation for frontend consumers.
