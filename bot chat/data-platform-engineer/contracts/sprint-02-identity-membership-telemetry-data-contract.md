# Sprint 02 Identity, Membership, and Telemetry Data Contract

Date: 2026-02-07
Owner: Data Platform Engineer
Consumers: Backend, Frontend, Security/Compliance, DevOps/SRE, QA/Release

## Scope

Supports auth shell gate readiness for `F2-E1` and observability baseline alignment.

## Identity and Membership Data Requirements

1. Workspace and membership records require:
   - `workspace_id`,
   - `user_id`,
   - `role`,
   - `status`,
   - `created_at`,
   - `updated_at`.
2. Membership changes require immutable audit trail entry.
3. Ownership transfer must enforce exactly one active owner rule.

## Auth Context Propagation Fields

- `workspace_id`
- `actor_id`
- `session_id`
- `correlation_id`
- `auth_method`
- `request_timestamp`

## Telemetry Requirements

1. Auth-related mutations emit structured logs with correlation fields.
2. Failed authz attempts emit denial class and target resource metadata.
3. Metrics required:
   - auth success/failure rate,
   - membership mutation rate,
   - unauthorized access attempt rate.

## Security Requirements

1. Tenant context mandatory for all membership reads/writes.
2. Denied actions must not leak resource existence across tenants.
3. Policy checks required in service and data layers.

## Gate Evidence

1. Auth shell positive/negative tests.
2. Membership mutation audit trail verification.
3. Telemetry field presence checks.
