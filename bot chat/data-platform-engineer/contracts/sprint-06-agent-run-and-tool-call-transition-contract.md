# Sprint 06 Agent Run and Tool Call Transition Contract

Date: 2026-02-07
Owner: Data Platform Engineer
Consumers: AI Runtime, Backend, DevOps/SRE, QA/Release

## Scope

Supports `F4-E2-S1`, `F4-E2-S2`, `F4-E2-S3`.

## `agent_runs` Status Enum

1. `queued`
2. `running`
3. `waiting_tool`
4. `retrying`
5. `failed`
6. `blocked_policy`
7. `completed`
8. `escalated_human`

## `tool_calls` Status Enum

1. `requested`
2. `authorized`
3. `executing`
4. `retrying`
5. `failed`
6. `blocked_policy`
7. `succeeded`
8. `canceled`

## Transition Rules

### Agent Runs

1. `queued -> running`
2. `running -> waiting_tool | completed | failed | blocked_policy | escalated_human`
3. `waiting_tool -> running | retrying | failed`
4. `retrying -> running | failed | escalated_human`
5. `blocked_policy`, `failed`, `completed`, and `escalated_human` are terminal.

### Tool Calls

1. `requested -> authorized | blocked_policy`
2. `authorized -> executing | canceled`
3. `executing -> succeeded | retrying | failed`
4. `retrying -> executing | failed`
5. `blocked_policy`, `failed`, `succeeded`, and `canceled` are terminal.

## Failure Class Contract

Allowed `error_class` categories:

1. `timeout`
2. `validation_error`
3. `authz_denied`
4. `policy_denied`
5. `provider_error`
6. `dependency_unavailable`
7. `unexpected_internal`

## Retry Rules

1. Default max retries per tool step: `2`.
2. Retry requires same `tool_call_id` and incremented `attempt_count`.
3. Idempotency key required for any external side effect.

## Persistence and Trace Fields (Required)

- `workspace_id`
- `actor_id`
- `correlation_id`
- `agent_run_id`
- `tool_call_id`
- `status`
- `error_class`
- `attempt_count`
- `started_at`
- `completed_at`
- `input_tokens`
- `output_tokens`
- `estimated_cost_usd`

## Gate Evidence

1. Valid transition tests for run and tool states.
2. Invalid transition rejection tests.
3. Policy-block and authz-denied negative-path tests.
4. Trace-field presence validation in run and tool telemetry.
