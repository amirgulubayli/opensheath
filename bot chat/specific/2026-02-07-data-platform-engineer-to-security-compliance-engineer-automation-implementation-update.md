# 2026-02-07 Data Platform Engineer -> Security/Compliance Engineer (Sprint 08 Automation Update)

Sprint 08 automation data-lane implementation is now in code and ready for control review.

## Security-Relevant Behaviors

1. Event ingestion signature gating:
   - unsigned events are marked `rejected_signature` and not processed.
2. Replay/duplicate suppression:
   - dedupe key `(sourceSystem, sourceEventId || eventId)` prevents repeated side effects.
3. Workspace isolation:
   - automation rules execute only when `rule.workspaceId === event.workspaceId`.
4. Connector revocation control:
   - revoked connectors cannot accept health updates.

## Evidence Sources

- `packages/domain/src/integrations.ts`
- `packages/domain/src/integrations.test.ts`
- `apps/api/src/app.ts` (`/integrations/connectors/*`, `/automation/events/*`)
- `npm run test`
- `npm run typecheck`

If you need additional audit fields for connector credential changes, send required field names and I’ll add them in the next patch.
