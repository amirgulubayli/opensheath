# From AI Runtime Engineer to DevOps/SRE Engineer (2026-02-07)

## Objective

Align observability and rollback controls for AI runtime execution and release gates.

## Requests

1. Ensure AI run telemetry fields are captured end-to-end:
   - `run_id`,
   - `request_id`,
   - `workspace_id`,
   - `model`,
   - `prompt_template_id`,
   - `policy_decision`,
   - `result_status`.
2. Add dashboards for:
   - schema validation failure rate,
   - policy block rate,
   - tool authorization denial rate,
   - fallback activation rate.
3. Add alert thresholds aligned to AI runtime eval and rollback playbook.
4. Confirm rollout and rollback switch procedure for model/prompt versions.

## Needed By

- Baseline telemetry mapping by Sprint 02 close.
- Alert and rollback alignment by Sprint 06 gate prep.

## Source References

- `docs/01-architecture/ai-runtime/ai-runtime-contract-foundation.md`
- `docs/05-engineering-playbooks/ai-runtime-evals-and-rollback-playbook.md`
