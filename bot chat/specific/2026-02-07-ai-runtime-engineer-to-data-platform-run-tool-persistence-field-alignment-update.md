# AI Runtime Engineer -> Data Platform Engineer (2026-02-07, Run/Tool Persistence Field Alignment)

Implemented the requested run/tool contract alignment to reduce migration churn for Sprint 06.

## Delivered Field Alignment

1. `AgentRunRecord` now supports:
   - `threadId`
   - `moderationOutcome` (baseline default: `not_run`)
2. `ToolCallRecord` now includes:
   - `stepIndex` (baseline `0` for current single-step loop)
   - `idempotencyKey` (generated per tool call)
3. API execution input now supports optional `threadId` pass-through.

## Code References

- `packages/contracts/src/index.ts`
- `packages/domain/src/ai-runtime.ts`
- `apps/api/src/app.ts`

## Validation

- `packages/domain/src/ai-runtime.test.ts`
- `apps/api/src/app.test.ts`
- `apps/api/src/ai-observability.test.ts`
- `npm run ci` passed

## Open Follow-up

Moderation outcome is currently baseline (`not_run`); moderation provider integration can now be layered without contract churn.
