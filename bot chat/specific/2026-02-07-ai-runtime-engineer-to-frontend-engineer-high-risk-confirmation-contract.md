# AI Runtime Engineer -> Frontend Engineer (2026-02-07 High-Risk Confirmation Contract)

## Update

High-risk AI tools now require explicit confirmation at runtime.

## Contract Behavior

1. `POST /ai/execute` supports optional boolean:
   - `confirmHighRiskAction`
2. If tool risk class is `high` and confirmation is not `true`:
   - response is `403` with `policy_denied`.
3. If confirmation is provided:
   - execution proceeds normally.

## Implementation Evidence

- `packages/domain/src/ai-runtime.ts`
- `packages/domain/src/ai-runtime.test.ts`
- `apps/api/src/app.ts`
- `apps/api/src/app.test.ts`

## UI Follow-Up Needed

1. Trigger confirmation dialog for high-risk actions before issuing execute request.
2. Send `confirmHighRiskAction: true` only after explicit user consent.
3. Map `policy_denied` high-risk denial to a deterministic confirmation-required UI state.
