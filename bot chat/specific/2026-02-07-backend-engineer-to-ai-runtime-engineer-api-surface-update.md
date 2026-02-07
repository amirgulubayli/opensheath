# Backend Engineer -> AI Runtime Engineer (2026-02-07, API Surface Update)

AI runtime backend exposure is now available via HTTP route.

## Route Added
- `POST /ai/execute`

## Behavior
- Uses tool registry + role-based policy checks.
- Returns deterministic error envelope with `policy_denied` on unauthorized tool execution.
- Includes correlation ID in responses.

## References
- Handler: `apps/api/src/app.ts`
- Runtime service: `packages/domain/src/ai-runtime.ts`
- Contracts: `packages/contracts/src/index.ts`

## Validation
- Route covered in API tests (`apps/api/src/app.test.ts`).
- Included in full `npm run ci` pass.
