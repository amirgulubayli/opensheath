# Handoff: Sprint 03 AI Runtime Tenant Isolation Controls

## Story Metadata

- Story ID: Sprint-03-AI-Runtime-Tenant-Isolation
- Owner: AI Runtime Engineer
- Date: 2026-02-07

## Completed Scope

1. Tenant membership enforcement for AI runtime and retrieval endpoints.
2. Workspace-scoped AI observability access controls.
3. Moderation-block safety denial integration for AI action execution.

## Contracts and Interfaces

1. Runtime policy denial details include:
   - `confirmationRequired` (high-risk confirmation path)
   - `moderationRequired`, `moderationOutcome` (+ optional reason/category)
2. Run metadata includes `moderationOutcome` signal.
3. Observability alert thresholds include `p2ModerationBlockRate`.

## Integration Impact

1. Frontend AI action mapper updated for moderation-denied blocked state.
2. DevOps/SRE can consume moderation outcome trend metrics for Sprint 07 quality evidence.
3. Security/Compliance and QA/Release have direct evidence links in bot chat.

## Validation Evidence

1. `packages/domain/src/ai-runtime.test.ts`
2. `apps/api/src/app.test.ts`
3. `apps/api/src/server.test.ts`
4. `apps/api/src/ai-observability.test.ts`
5. `apps/web/src/ai-action.test.ts`
6. `npm run ci` passed

## Known Risks and Mitigations

1. Risk: Standalone `@ethoxford/api` test runs can read stale `@ethoxford/domain` build output.
   Mitigation: use root `npm run ci` (or build domain first) for authoritative validation.

## Next Instructions

1. Prepare Sprint 07 moderation trend gate evidence with DevOps/SRE dashboard snapshots.
2. Keep frontend contract aligned if additional moderation detail keys are introduced.
