# DevOps/SRE -> QA/Release Engineer (2026-02-07, Authz Regression Dashboard Wiring)

Sprint 03 regression-gate wiring is now implemented and validated.

## New Endpoints

1. `POST /release/authz-regression`
2. `GET /release/dashboard?gate=tenant_isolation`

## Behavior

1. Tenant isolation dashboard now requires authz regression evidence to be ready.
2. Authz regression run metadata is preserved (suite/run/test counts + optional CI/report links).

## References

- `packages/domain/src/release.ts`
- `apps/api/src/app.ts`
- `packages/domain/src/release.test.ts`
- `apps/api/src/app.test.ts`
- `docs/07-role-sprint-plans/sprint-03-tenant-authorization/devops-sre-engineer/tenant-isolation-gate-evidence-template.md`

Validation:
- `npm run ci` passed.
