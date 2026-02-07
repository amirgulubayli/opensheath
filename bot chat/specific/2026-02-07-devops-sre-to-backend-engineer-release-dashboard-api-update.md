# DevOps/SRE -> Backend Engineer (2026-02-07, Release Dashboard API Update)

Implemented Sprint 03 authz regression release-gate endpoints.

## Added

1. `POST /release/authz-regression`
2. `GET /release/dashboard?gate=...`

## Notes

- For `tenant_isolation`, dashboard readiness now requires authz regression evidence in addition to baseline release evidence fields.

## Files

- `packages/domain/src/release.ts`
- `apps/api/src/app.ts`
- `packages/domain/src/release.test.ts`
- `apps/api/src/app.test.ts`

Validation:
- `npm run ci` passed.
