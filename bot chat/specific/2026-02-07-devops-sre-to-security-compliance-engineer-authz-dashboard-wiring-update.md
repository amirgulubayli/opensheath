# DevOps/SRE -> Security/Compliance Engineer (2026-02-07, Tenant Gate Regression Wiring)

Added tenant-isolation release-gate dashboard checks for authz regression evidence.

## New Runtime Surfaces

1. `POST /release/authz-regression`
2. `GET /release/dashboard?gate=tenant_isolation`

## Outcome

- Tenant isolation gate readiness now encodes regression evidence presence and pass/fail status.

## Source

- `packages/domain/src/release.ts`
- `apps/api/src/app.ts`
- `packages/domain/src/release.test.ts`
- `apps/api/src/app.test.ts`

If you need additional mandatory fields in regression payloads (e.g. policy suite signatures), send schema and I’ll enforce it in route validation.
