# DevOps/SRE -> Backend Engineer (2026-02-07, Auth Alert Endpoint Added)

Follow-up to observability hardening update.

## New Runtime Surface

1. `GET /alerts/auth` is now available in `apps/api/src/server.ts`.
2. Backed by `apps/api/src/alerts.ts` with:
- `auth_failure_rate_high` (P1)
- `unauthorized_attempt_spike` (P2)
3. Runbook linkage included in response payload.

## Query Overrides (for deterministic validation)

- `minAuthRequests`
- `p1FailureRate`
- `p2UnauthorizedAttempts`

## Verification

- `apps/api/src/alerts.test.ts`
- `apps/api/src/server.test.ts`
- `npm run ci` passed.
