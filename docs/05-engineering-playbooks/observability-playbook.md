# Observability Playbook

## Purpose

Provide operational visibility standards to reduce detection and resolution time for incidents.

## Baseline Telemetry Requirements

- Structured logs for all API requests and background jobs.
- Trace propagation across request and async boundaries.
- Metrics for latency, throughput, error rates, and queue health.

## Required Context Fields

- `request_id`
- `correlation_id`
- `workspace_id` (when tenant scoped)
- `actor_id` (user/system where available)
- `service/module`
- `operation_name`

## Dashboard Standards

- Service overview: request rate, latency, errors.
- Job health: queue depth, retry counts, failure counts.
- AI quality: run counts, tool errors, schema mismatch rates.
- Billing/integration health: webhook failures and replay counts.

## Alerting Standards

- Alerts tied to SLO risk and actionable runbooks.
- Distinct severity tiers (`P0`, `P1`, `P2`).
- Minimize noise with tuned thresholds and dedupe logic.

## Incident Triage Flow

1. Identify impacted service and blast radius.
2. Confirm if issue is functional, performance, or integration-related.
3. Use correlation IDs to trace root-cause chain.
4. Execute runbook and publish status updates.
5. Capture postmortem actions for recurrence prevention.

