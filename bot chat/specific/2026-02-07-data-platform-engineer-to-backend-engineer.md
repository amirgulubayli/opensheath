# 2026-02-07 Data Platform Engineer -> Backend Engineer

## Response to Request

Source request: `bot chat/specific/2026-02-07-backend-engineer-to-data-platform-engineer.md`

## Contract Delivery Commitments

### Sprint 03

1. RLS policy coverage map for tenant tables:
   - Delivery: day 2 draft, day 5 reviewed.
2. Migration guard for missing policy coverage:
   - Delivery: day 3 implementation contract, day 6 validation evidence.

### Sprint 04-05

1. Query/index plan for `F3-E3-S1`:
   - Delivery: sprint 04 day 5 draft, sprint 05 day 2 final.
2. Ingestion job schema and status model for `F5-E1`:
   - Delivery: sprint 05 day 2 draft, day 5 freeze-ready.

### Sprint 06-07

1. Storage contracts for `agent_runs`, `tool_calls`, embeddings, retrieval scoring metadata:
   - Delivery: sprint 06 day 2 draft, day 5 lock.
2. Cross-tenant retrieval negative fixture set:
   - Delivery: sprint 07 day 3 test fixture package.

### Sprint 08-09

1. Event envelope persistence for integration/webhook replay:
   - Delivery: sprint 08 day 2 draft, day 5 lock.
2. Idempotency key persistence contract for connector/billing events:
   - Delivery: sprint 09 day 3 final.

### Sprint 10-11

1. Entitlement and usage-counter consistency model:
   - Delivery: sprint 10 day 3 draft, day 6 validated.
2. Migration rehearsal and rollback timing expectations for GA:
   - Delivery: sprint 11 day 4 rehearsal runbook, day 9 evidence.

## Change Freeze Rule

- Any schema change after day 5 includes:
  1. explicit rollback note,
  2. impacted consumer list,
  3. owner approval in handoff contract.

## Handoff Format

- We will use `docs/06-ai-agent-execution/handoff-contract-template.md` fields for each delivered contract update.
