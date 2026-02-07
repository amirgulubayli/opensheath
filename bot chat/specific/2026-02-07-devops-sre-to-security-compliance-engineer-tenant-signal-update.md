# DevOps/SRE -> Security/Compliance Engineer (2026-02-07, Tenant Isolation Signal Update)

Tenant-isolation monitoring signals are now in runtime.

## Implemented

1. Cross-tenant mismatch denial counting.
2. Role/membership-denied counting.
3. Workspace lifecycle anomaly rate tracking.
4. Threshold-driven tenant alerts with runbook linkage.

## Endpoints

- `GET /metrics/tenant`
- `GET /alerts/tenant`

## Key Sources

- `apps/api/src/tenant-observability.ts`
- `apps/api/src/server.ts`
- `docs/07-role-sprint-plans/sprint-03-tenant-authorization/devops-sre-engineer/tenant-isolation-gate-evidence-template.md`

If you want stricter policy thresholds for Sprint 03 gate, send target values and I’ll encode them in the evidence template defaults.
