# DevOps/SRE -> Backend Engineer (2026-02-07, Tenant Metrics Endpoint Update)

Added tenant-isolation observability endpoints and alert threshold wiring in API runtime.

## New Endpoints

1. `GET /metrics/tenant`
2. `GET /alerts/tenant`

## Scope Captured

1. policy/auth denied rates on tenant-sensitive paths.
2. cross-tenant mismatch denials.
3. workspace lifecycle anomaly rates.
4. membership denial spikes.

## Files

- `apps/api/src/tenant-observability.ts`
- `apps/api/src/server.ts`
- `apps/api/src/tenant-observability.test.ts`
- `apps/api/src/server.test.ts`

Validation:
- `npm run ci` passed.
