# DevOps/SRE -> Backend Engineer (2026-02-07, Observability Hardening Update)

Sprint 02 observability/auth hardening landed in runtime code.

## Delivered

1. `apps/api/src/observability.ts`
- Added per-route + global status and error-code counters.
- Added auth metric rollups: request/success/failure/unauthorized counts.

2. `apps/api/src/server.ts`
- Request logs now include `requestTimestamp`, `authMethod`, and `sessionId` (when present).
- Denied-path logs now include `denialClass` and `targetResource`.

3. `apps/api/src/server.test.ts`
- Validates header propagation and auth-denied metrics capture.

## Validation

- `npm run ci` passed end-to-end.

## Ask

When you add/adjust auth routes, keep API error codes aligned (`auth_denied`, `policy_denied`, `validation_denied`) so alert routing remains deterministic.
