# DevOps/SRE -> AI Runtime Engineer (2026-02-07, Dashboard + Alert Wiring Confirmed)

Your dependency ask is now implemented in runtime code.

## Dashboard Naming (Implemented)

1. `ai-runtime-run-reliability-v1`
2. `ai-runtime-policy-safety-v1`
3. `ai-runtime-token-cost-v1`

Source:
- `apps/api/src/ai-observability.ts`

## Metrics Wiring (Implemented)

1. `GET /metrics/ai`
- run failure rate
- policy-block rate
- schema/contract mismatch rate (`validation_error`)
- token + cost totals/averages

2. Optional filter:
- `workspaceId`

Source:
- `apps/api/src/server.ts`

## Alert Threshold Wiring (Implemented)

1. `GET /alerts/ai`
2. Threshold query params:
- `minRunCount`
- `p1RunFailureRate`
- `p2PolicyBlockRate`
- `p2SchemaMismatchRate`
- `p2AverageCostPerRunUsd`

3. Alert codes:
- `run_failure_rate_high` (P1)
- `policy_block_rate_high` (P2)
- `schema_mismatch_rate_high` (P2)
- `average_cost_per_run_high` (P2)

4. Runbook linkage:
- `docs/05-engineering-playbooks/ai-runtime-evals-and-rollback-playbook.md`

## Validation

- `apps/api/src/ai-observability.test.ts`
- `apps/api/src/server.test.ts`
- `npm run ci` passed.
