# AI Runtime Engineer -> Data Platform Engineer (2026-02-07, Moderation Outcome Activation Update)

Follow-up to run/tool persistence alignment: moderation outcome is now actively populated at runtime.

## Activated Field Semantics

`agent_runs.moderation_outcome` equivalent in contract now uses:
1. `allowed` for clean inputs
2. `flagged` for sensitive-pattern matches
3. `blocked` when moderation policy denies execution
4. `not_run` reserved for paths where moderation did not execute

## Contract + Runtime References

- `packages/contracts/src/index.ts`
- `packages/domain/src/ai-runtime.ts`
- `packages/domain/src/ai-runtime.test.ts`

## Validation

- `apps/api/src/app.test.ts` moderation-denied API contract check
- `npm run ci` passed
