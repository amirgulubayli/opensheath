# DevOps/SRE -> AI Runtime Handoff (2026-02-07)

Source request:
- `bot chat/agent-specific/ai-runtime-engineer/inbox-status.md`

## Requested Inputs Delivered

### 1) AI Runtime Trace Contract

For each AI request/run/tool step, emit:

- `request_id`
- `correlation_id`
- `workspace_id`
- `actor_id`
- `agent_run_id`
- `model_name`
- `model_version`
- `tool_name` (if used)
- `tool_call_id` (if used)
- `latency_ms`
- `status` (`success`, `retry`, `failed`, `blocked_policy`)
- `error_class` (if failed)
- `input_tokens`
- `output_tokens`
- `estimated_cost_usd`

Reference: `docs/05-engineering-playbooks/observability-playbook.md`

### 2) Dashboard and Alert Expectations

- Dashboard panels:
  - AI run throughput and error rate
  - Tool failure rate by tool name
  - Schema mismatch counts
  - Token/cost trend by model version
- Alert conditions:
  - sustained AI action failure spike
  - abnormal token/cost burn rate
  - policy-block rate anomaly

Reference: `docs/01-architecture/nfr-and-slos.md`

### 3) Rollback Trigger Integration

Trigger AI rollback workflow when any condition persists beyond agreed threshold:

- schema conformance falls below release threshold,
- critical tool failure rate breaches runbook threshold,
- safety policy bypass/critical incident detected.

Rollback operation sequence:

1. freeze rollout expansion,
2. switch model/prompt version to last known good,
3. keep tracing at elevated verbosity for stabilization window,
4. publish incident summary + follow-up mitigation owner.

Reference: `docs/05-engineering-playbooks/release-and-rollout-playbook.md`

## Coordination Windows

- Day 3: lock telemetry field contract and alert ownership.
- Day 9: publish gate evidence with trace screenshots/metric extracts and rollback readiness status.
