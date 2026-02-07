# Auth Shell Gate Evidence Template (Sprint 02)

Role: DevOps/SRE Engineer  
Gate: Auth shell gate

## 1. Story Coverage

- Included story IDs:
- Included PRs:
- Auth components covered:

## 2. Observability Evidence

### Logging

- Structured log schema reference:
- Required context fields present (`request_id`, `correlation_id`, `workspace_id`, `actor_id`):
- Sample log references:

### Tracing and Metrics

- Trace propagation proof for auth and callback paths:
- Auth latency/error dashboard links:
- Session lifecycle metrics (issue/refresh/expiry):
- Runtime metrics endpoint evidence (`GET /metrics`):

## 3. Alerting and Runbook Evidence

- Alert rules configured:
- Severity routing (`P0/P1/P2`):
- Runbook links attached:
- Alert test/simulation evidence:
- Auth alert endpoint evidence (`GET /alerts/auth`):

## 4. Security and Secret Controls

- Secret ownership and rotation reference:
- OAuth callback hardening references:
- Unauthorized access telemetry references:

## 5. Failure-Path Validation

- Unauthorized route access attempts captured:
- Auth callback failure diagnostics captured:
- Recovery/fallback behavior validated:

## 6. Risk and Dependency Status

| ID | Risk/Dependency | Status | Owner | Mitigation/Due |
|---|---|---|---|---|
| | | | | |

## 7. Sign-Off

- DevOps/SRE:
- QA/Release:
- Security/Compliance:
- Date:

## Implementation References (Current Baseline: 2026-02-07)

Use these references when filling the template:

1. Runtime observability + logging:
   - `apps/api/src/observability.ts`
   - `apps/api/src/server.ts`
2. Auth alert threshold evaluator:
   - `apps/api/src/alerts.ts`
3. Verification tests:
   - `apps/api/src/observability.test.ts`
   - `apps/api/src/server.test.ts`
   - `apps/api/src/alerts.test.ts`
4. Incident/runbook linkage source:
   - `docs/07-role-sprint-plans/sprint-02-observability-auth-baseline/devops-sre-engineer/incident-alert-validation-plan.md`
