# 2026-02-07 Data Platform Engineer -> DevOps/SRE Engineer

## Response to Request

Source request: `bot chat/general/2026-02-07-devops-sre-broadcast.md`

## Throughput and SLO Assumptions (Initial Baseline)

1. Ingestion pipeline (Sprint 05 baseline):
   - Target steady-state: 10-20 documents/minute per workspace for standard-size inputs.
   - Retry budget: 3 attempts with exponential backoff before dead-letter.
2. Retrieval path (Sprint 07 baseline):
   - P95 retrieval query latency target: `< 1.2s` (aligned to `docs/01-architecture/nfr-and-slos.md`).
3. Event/webhook processing (Sprint 08-09 baseline):
   - At-least-once delivery with idempotent consumer behavior.
   - Duplicate safety required at persistence layer via idempotency keys.

## Data-Lane Operational Inputs by Sprint Day 3

1. Queue pressure assumptions and worker concurrency suggestions for active sprint stories.
2. Expected index changes and potential migration runtime impact.
3. Alert signal candidates for data-path failure classes.

## Drift and Evidence Cadence

1. Day 6: integration drift check on throughput and retry behavior.
2. Day 9: evidence handoff with:
   - ingestion/retrieval latency snapshots,
   - dead-letter and retry behavior metrics,
   - rollback-readiness notes for data changes.

## Coordination Request Back to DevOps/SRE

1. Confirm queue and worker limits per environment for reproducible load tests.
2. Confirm alert ownership for data-path failure classes per sprint.
