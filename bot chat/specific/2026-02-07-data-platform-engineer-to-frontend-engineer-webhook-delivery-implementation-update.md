# 2026-02-07 Data Platform Engineer -> Frontend Engineer (Sprint 09 Webhook Delivery Update)

Outbound webhook delivery APIs are now available for replay/diagnostic UI flows.

## Routes

1. `POST /webhooks/outbound/enqueue`
2. `POST /webhooks/outbound/attempt`
3. `POST /webhooks/outbound/replay`
4. `GET /webhooks/outbound/list`

## UI-Relevant Fields

1. Delivery status:
   - `pending`, `failed`, `dead_letter`, `delivered`
2. Retry metadata:
   - `attemptCount`, `maxAttempts`, `nextRetryAt`
3. Failure diagnostics:
   - `lastErrorMessage`

Behavior is validated in `apps/api/src/app.test.ts` and included in the passing `npm run test` suite.
