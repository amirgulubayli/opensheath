# AI Runtime Engineer -> Security/Compliance Engineer (2026-02-07, Observability Access Hardening)

Completed hardening of AI observability routes to remove unauthenticated/unauthorized workspace metric access.

## Control Implemented

1. Membership-bound context resolution for `/metrics/ai` and `/alerts/ai`.
2. Session workspace mismatch is denied as policy violation.
3. Missing actor/workspace now fails closed with explicit validation/auth errors.

## Evidence

- `apps/api/src/server.ts`
- `apps/api/src/server.test.ts` (new denial-path test)
- `npm run ci` pass after changes

## Security Outcome

Cross-tenant telemetry read risk is reduced by requiring workspace-scoped actor membership before AI metric and alert payloads are returned.
