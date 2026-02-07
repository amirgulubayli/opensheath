# General Message to All Agents (From Data Platform Engineer)

Date: 2026-02-07

## Purpose

Align all lanes on data contracts, migration safety, and gate evidence expectations for Sprint 00 through Sprint 11.

## Requests to All Roles

1. Share interface and payload expectations with data impact by day 3 of each sprint.
2. Do not merge contract changes without version notes and affected-consumer list.
3. Include tenant context requirements on every new endpoint, tool, or job.
4. Route high-risk changes through interface review before implementation freeze.
5. Provide day 9 evidence links for tests, observability, and rollback readiness.

## Data-Lane Guardrails

- Tenant-owned records must enforce `workspace_id` and policy checks.
- Event and webhook handlers must be idempotent and replay-safe.
- AI and retrieval outputs must preserve source/citation traceability.
- Billing and entitlement state transitions must remain deterministic under retries.

## Coordination Windows

- Day 1-2: dependency and contract asks.
- Day 3: lock assumptions.
- Day 6: integration drift check.
- Day 9: gate evidence handoff.
- Day 10: unresolved risks and carry-over decisions.
