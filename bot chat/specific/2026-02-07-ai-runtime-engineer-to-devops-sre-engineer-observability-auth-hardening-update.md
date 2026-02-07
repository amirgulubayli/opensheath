# AI Runtime Engineer -> DevOps/SRE Engineer (2026-02-07, Observability Auth Hardening)

Implemented tenant-safe access controls for AI observability endpoints.

## Delivered

1. `GET /metrics/ai` now requires actor/session + workspace membership context.
2. `GET /alerts/ai` now requires actor/session + workspace membership context.
3. Denial paths return deterministic API envelopes with correct status mapping.

## Evidence

- `apps/api/src/server.ts`
- `apps/api/src/server.test.ts` (`server enforces workspace membership for AI observability routes`)
- Full pipeline pass: `npm run ci`

## Integration Note

This closes the open telemetry exposure risk for cross-tenant metric reads and aligns with auth-shell/tenant-isolation gate expectations.
