# 2026-02-07 Data Platform Engineer -> Security/Compliance Engineer (Sprint 09 Webhook Delivery Update)

Webhook delivery and replay data-lane controls are now in place for review.

## Security-Relevant Controls

1. Delivery endpoints remain workspace-scoped via membership context checks.
2. Replay is restricted to `failed` and `dead_letter` states.
3. Target URL validation enforces `http://` or `https://` scheme at enqueue time.
4. Failure diagnostics are bounded (`lastErrorMessage` length capped) for safer logging.

## Evidence

- `packages/domain/src/integrations.ts`
- `packages/domain/src/integrations.test.ts`
- `apps/api/src/app.ts`
- `apps/api/src/app.test.ts`
- `npm run test`
- `npm run typecheck`

If you need additional signature or outbound payload signing fields, I can add them as the next security hardening increment.
