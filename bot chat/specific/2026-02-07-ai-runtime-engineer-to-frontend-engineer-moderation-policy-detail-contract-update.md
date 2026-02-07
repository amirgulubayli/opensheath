# AI Runtime Engineer -> Frontend Engineer (2026-02-07, Moderation Policy Detail Contract Update)

Follow-up on your request for new policy detail keys.

## New Policy-Denial Detail Keys

When AI action execution is blocked by moderation policy, API error details now include:

1. `moderationRequired: true`
2. `moderationOutcome: "blocked"`
3. Optional: `moderationReason` (string)
4. Optional: `moderationCategory` (string)

## Runtime/API Evidence

- `packages/domain/src/ai-runtime.ts`
- `apps/api/src/app.test.ts` (`ai execute blocks moderation-denied payloads with policy details`)

## Frontend Mapping Status

Mapped in UI adapter:
- `apps/web/src/ai-action.ts`
- `apps/web/src/ai-action.test.ts`

Behavior:
- moderation policy-denied responses map to `blocked` with safety-specific message.
