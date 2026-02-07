# Sprint 05-11 Gate Evidence Skeleton (Data Platform)

Date: 2026-02-07
Owner: Data Platform Engineer

## Sprint 05 - Discoverability Gate

- Contracts:
  - `bot chat/data-platform-engineer/contracts/sprint-05-query-index-behavior-contract.md`
  - `bot chat/data-platform-engineer/contracts/sprint-05-ingestion-state-and-retry-contract.md`
- Evidence:
  - query latency metrics,
  - ingestion retry/dead-letter tests,
  - tenant isolation checks.

## Sprint 06 - AI Action Gate

- Contracts:
  - `bot chat/data-platform-engineer/contracts/sprint-06-agent-run-and-tool-call-transition-contract.md`
- Evidence:
  - transition validity tests,
  - policy-block negative tests,
  - telemetry field presence checks.

## Sprint 07 - AI Quality Gate

- Contracts:
  - `bot chat/data-platform-engineer/contracts/sprint-07-retrieval-citation-provenance-contract.md`
- Evidence:
  - retrieval leakage negatives:
    - `apps/api/src/app.test.ts` (`retrieval routes index, query, and cite with tenant isolation`)
    - `packages/domain/src/retrieval.test.ts` (`retrieval query is tenant-scoped and ranked`)
  - citation completeness checks:
    - `packages/domain/src/retrieval.test.ts` (`citation provenance payload uses retrieval confidence`)
    - `apps/api/src/app.ts` (`POST /retrieval/citations`, `GET /retrieval/citations`)
  - execution evidence commands:
    - `npm run test`
    - `npm run typecheck`

## Sprint 08 - Automation Gate

- Contracts:
  - `bot chat/data-platform-engineer/contracts/sprint-08-event-envelope-and-idempotency-contract.md`
- Evidence:
  - duplicate suppression and ingestion status checks:
    - `packages/domain/src/integrations.test.ts` (`event bus dedupes repeated source events and records ingestion status`)
    - `apps/api/src/app.test.ts` (`integration and automation routes persist connector lifecycle and run history`)
  - connector lifecycle and health transition checks:
    - `packages/domain/src/integrations.test.ts` (`connector service records lifecycle and health states`)
    - `apps/api/src/app.ts` (`/integrations/connectors/*` routes)
  - automation run durability and workspace scoping checks:
    - `packages/domain/src/integrations.test.ts` (`automation engine runs only workspace-matching rules`)
    - `apps/api/src/app.ts` (`/automation/rules/*`, `/automation/events/*`, `/automation/runs`)
  - execution evidence commands:
    - `npm run test`
    - `npm run typecheck`

## Sprint 09 - Billing Sync Gate

- Contracts:
  - `bot chat/data-platform-engineer/contracts/sprint-09-billing-sync-and-webhook-reconciliation-contract.md`
- Evidence:
  - outbound webhook delivery and replay controls:
    - `packages/domain/src/integrations.test.ts` (`webhook delivery service handles dead-letter and replay lifecycle`)
    - `apps/api/src/app.test.ts` (`outbound webhook routes support dead-letter and replay controls`)
  - billing webhook consistency and out-of-order handling:
    - `packages/domain/src/billing.test.ts` (`billing dedupes repeated webhook events`)
    - `packages/domain/src/billing.test.ts` (`billing rejects unsigned webhooks and records event status`)
  - endpoint coverage:
    - `apps/api/src/app.ts` (`/webhooks/outbound/*` and `/billing/reconcile`)
  - execution evidence commands:
    - `npm run test`
    - `npm run typecheck`

## Sprint 10 - Beta Readiness Gate

- Contracts:
  - `bot chat/data-platform-engineer/contracts/sprint-10-entitlement-usage-analytics-consistency-contract.md`
- Evidence:
  - counter race/replay and entitlement checks:
    - `packages/domain/src/billing.test.ts` (`billing reconciliation and entitlement checks are deterministic`)
  - analytics integrity anomaly reports:
    - `packages/domain/src/billing.test.ts` (`billing emits integrity anomalies when plan snapshot drifts`)
    - `apps/api/src/app.test.ts` (`billing analytics routes store events and expose integrity anomalies`)
  - endpoint coverage:
    - `apps/api/src/app.ts` (`POST /billing/analytics-events`, `GET /billing/analytics-events`, `GET /billing/integrity-anomalies`)
  - execution evidence commands:
    - `npm run test`
    - `npm run typecheck`

## Sprint 11 - GA Launch Gate

- Contracts:
  - `bot chat/data-platform-engineer/contracts/sprint-11-ga-migration-rollback-and-data-readiness-contract.md`
- Evidence:
  - migration rehearsal report,
  - rollback rehearsal report,
  - data-path SLO/load snapshot,
  - unresolved risk and mitigation list.
