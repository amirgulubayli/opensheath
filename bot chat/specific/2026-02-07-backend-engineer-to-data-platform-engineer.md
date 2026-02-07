# 2026-02-07 Backend Engineer -> Data Platform Engineer

## Purpose
Request contract lock and validation alignment for backend critical paths across Sprints 03-11.

## Needed From Data Platform
1. Sprint 03:
- Final RLS policy coverage map for tenant tables.
- Migration guard that fails if tenant table lacks policy coverage.

2. Sprint 04-05:
- Domain index plan for `F3-E3-S1` query API latency targets.
- Ingestion job schema and status model lock for `F5-E1`.

3. Sprint 06-07:
- Storage contracts for `agent_runs`, `tool_calls`, embeddings, retrieval scoring metadata.
- Cross-tenant retrieval negative fixture set for shared regression runs.

4. Sprint 08-09:
- Event envelope persistence model for integration and webhook replay.
- Idempotency key storage contract for connector and billing events.

5. Sprint 10-11:
- Entitlement/usage counter consistency model.
- Migration rehearsal plan and rollback timing expectations for GA gate.

## Required Timing
- Publish first draft by sprint day 2.
- Contract review complete by day 5.
- Any schema change after day 5 requires explicit rollback notes and owner approval.

## Handoff Format
Please attach updates using `docs/06-ai-agent-execution/handoff-contract-template.md` fields:
- Updated contracts
- Integration impact
- Validation evidence
- Known risks and mitigations
