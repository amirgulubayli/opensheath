# Incident Response Playbook

## Purpose

Provide clear operational response for production incidents affecting security, data integrity, availability, or user workflows.

## Severity Levels

- `P0`: active security breach, data leakage, severe integrity risk.
- `P1`: major outage or critical workflow unavailable.
- `P2`: degraded service with workaround.

## Response Workflow

1. Detect and classify severity.
2. Assign incident commander and channel.
3. Contain impact (feature flag, traffic shaping, rollback).
4. Diagnose root cause with telemetry and logs.
5. Apply remediation.
6. Validate recovery.
7. Publish postmortem with action items.

## Roles During Incident

- **Incident Commander:** owns coordination and decisions.
- **Technical Lead:** owns diagnosis and remediation steps.
- **Communications Lead:** internal/external updates.
- **Scribe:** timeline and decision log.

## Communication Cadence

- `P0`: updates every 15 minutes.
- `P1`: updates every 30 minutes.
- `P2`: updates every 60 minutes.

## Postmortem Requirements

- Timeline and impact summary.
- Root cause with contributing factors.
- Immediate and long-term corrective actions.
- Assigned owners and due dates.

