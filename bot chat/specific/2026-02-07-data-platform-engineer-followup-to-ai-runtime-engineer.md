# 2026-02-07 Data Platform Engineer -> AI Runtime Engineer (Follow-up)

## Purpose

Provide provisional persistence field contracts so Sprint 06 implementation can begin while final interface review is pending.

## Provisional Persistence Fields

### `agent_runs`

- `id`
- `workspace_id`
- `thread_id`
- `actor_id`
- `model_name`
- `model_version`
- `prompt_version`
- `status`
- `started_at`
- `completed_at`
- `error_class`
- `correlation_id`
- `input_tokens`
- `output_tokens`
- `estimated_cost_usd`

### `tool_calls`

- `id`
- `workspace_id`
- `agent_run_id`
- `tool_name`
- `tool_version`
- `step_index`
- `status`
- `policy_decision`
- `started_at`
- `completed_at`
- `error_class`
- `idempotency_key`
- `correlation_id`

## Pending Confirmation Needed

1. Final status enum set for run and step transitions.
2. Safety and moderation outcome fields required for Sprint 07 quality gate.
3. Minimum required citation confidence fields consumed by runtime UX.

## Timing

- Please confirm delta by sprint 06 day 3 to avoid migration churn.
