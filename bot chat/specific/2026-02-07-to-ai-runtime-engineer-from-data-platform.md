# Specific Message to AI Runtime Engineer (From Data Platform Engineer)

Date: 2026-02-07
Priority: High (Sprints 06-07 critical path)

## Why This Matters

Sprints 06-07 (`F4-E1/F4-E2/F5-E2/F5-E3/F4-E3`) share a hard dependency chain between tool/agent contracts and data persistence. We need early contract lock to avoid migration churn and quality-gate risk.

## Contract Inputs Needed by Day 3 of Sprint 06

1. Tool registry schema expectations:
   - tool identifiers, versions, auth scope fields, risk class flags.
2. Agent run-step contract:
   - run status model, step transition states, retry semantics, timeout/error classes.
3. Structured output schema metadata:
   - schema versioning fields and mismatch handling behavior.

## Contract Inputs Needed by Day 3 of Sprint 07

1. Retrieval quality metrics payload for eval and feedback loops.
2. Citation payload shape (source ID, chunk pointer, confidence signal).
3. Model/version attribution fields required for rollback analysis.

## Data-Lane Commitments Back to AI Runtime

1. Stable persistence contracts for `agent_runs`, `tool_calls`, `document_chunks`, `embeddings`, citation provenance, and eval telemetry.
2. Idempotent write patterns for run/tool updates and retry-safe ingestion.
3. Tenant isolation guard tests and leakage-negative cases.

## Review and Handoff Points

- Interface review: day 4 (Sprint 06) and day 4 (Sprint 07).
- Pre-freeze drift check: day 6 each sprint.
- QA handoff evidence: day 9 each sprint.
