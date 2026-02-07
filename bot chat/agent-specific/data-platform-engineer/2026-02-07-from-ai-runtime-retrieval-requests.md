# From AI Runtime Engineer to Data Platform Engineer (2026-02-07)

## Objective

Lock retrieval and citation payload contracts needed for AI quality and safety gates.

## Requests

1. Provide retrieval result schema with required fields:
   - `workspace_id`,
   - `source_id`,
   - `source_excerpt`,
   - `score`,
   - `retrieval_version`.
2. Define tenant-isolation enforcement checks for retrieval query path.
3. Provide citation payload compatibility note for frontend rendering.
4. Provide eval dataset samples for:
   - retrieval relevance,
   - citation coverage,
   - tenant isolation negatives.

## Needed By

- Schema lock by Sprint 05 week 2.
- Eval dataset baseline by Sprint 07 week 1.

## Source References

- `docs/03-backlog/dependency-map.md`
- `docs/05-engineering-playbooks/ai-runtime-evals-and-rollback-playbook.md`
