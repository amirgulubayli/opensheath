# Sprint 02 Operations Checklist (DevOps/SRE)

Sprint: 02 - Observability and auth baseline  
Gate: Auth shell gate  
Story scope: `F1-E3-S1`, `F1-E3-S2`, `F1-E3-S3`, `F2-E1-S1`, `F2-E1-S2`, `F2-E1-S3`

## Week 1 Checklist

1. Structured logging schema locked for auth and protected-route flows.
2. Correlation IDs propagated through auth entry points and callbacks.
3. Baseline dashboards created for:
   - auth success/failure rates
   - session refresh errors
   - protected-route unauthorized attempts
4. Alert thresholds drafted for auth service degradation.
5. Secret handling and rotation path reviewed for auth dependencies.

## Week 2 Checklist

1. OAuth provider callback health monitoring validated.
2. Unauthorized access and authz-denied signal alerts validated.
3. Runbook links attached to P1/P2 auth alerts.
4. Alert noise calibration completed (dedupe and threshold tuning).
5. Auth shell gate evidence packet assembled for day-9 handoff.

## One-Day Task Decomposition

| Task ID | Story | Task | Reviewer | Evidence |
|---|---|---|---|---|
| S02-DV-01 | F1-E3-S1 | Standardize auth log fields (`request_id`, `correlation_id`, `workspace_id`, `actor_id`) | Backend | sample logs + schema doc |
| S02-DV-02 | F1-E3-S2 | Instrument auth route traces and latency/error metrics | DevOps/SRE | dashboard snapshots |
| S02-DV-03 | F1-E3-S3 | Configure auth incident alerts with runbook links | QA/Release | alert test output |
| S02-DV-04 | F2-E1-S1 | Validate session lifecycle monitoring (issue/refresh/expiry) | Backend + Frontend | metric panel and edge-case evidence |
| S02-DV-05 | F2-E1-S2 | Add OAuth callback failure alerts and diagnostics | Security/Compliance | callback failure simulation |
| S02-DV-06 | F2-E1-S3 | Validate protected-route unauthorized telemetry and alert rules | QA/Release | unauthorized-path test evidence |
| S02-DV-07 | F1-E3/F2-E1 | Assemble day-9 auth shell gate packet | QA/Release | completed gate packet |
