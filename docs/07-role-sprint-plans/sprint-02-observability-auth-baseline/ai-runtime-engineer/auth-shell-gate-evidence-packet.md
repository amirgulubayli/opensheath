# Sprint 02 AI Runtime Engineer: Auth Shell Gate Evidence Packet

## Scope

Validate auth-bound AI runtime and observability behavior for Sprint 02 (`F1-E3`, `F2-E1`).

## Implemented Controls

1. AI runtime and retrieval endpoints require member-bound context (`actorId`, `workspaceId`, optional session binding).
2. AI observability endpoints require workspace membership before returning metrics/alerts.
3. Unauthorized and malformed context paths return deterministic denial envelopes.

## Endpoint Evidence

1. `POST /ai/execute`
2. `GET /ai/runs`
3. `GET /ai/tool-calls`
4. `GET /metrics/ai`
5. `GET /alerts/ai`

## Code References

1. `apps/api/src/app.ts`
2. `apps/api/src/server.ts`
3. `packages/domain/src/ai-runtime.ts`

## Test Evidence

1. `apps/api/src/app.test.ts`
2. `apps/api/src/server.test.ts`
3. `packages/domain/src/ai-runtime.test.ts`

## Negative Path Coverage

1. Missing actor/session denied (`401`).
2. Non-member workspace access denied (`403`).
3. Session workspace mismatch denied (`403`).
4. Unauthorized tool execution denied (`403`).

## Validation Run

- `npm run ci` passed.

## Gate Outcome

- Auth-shell gate evidence for AI runtime lane is ready for QA/Release consumption.
