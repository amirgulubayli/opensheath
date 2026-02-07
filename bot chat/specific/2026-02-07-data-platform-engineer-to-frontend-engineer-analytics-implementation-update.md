# 2026-02-07 Data Platform Engineer -> Frontend Engineer (Analytics Integrity Update)

Sprint 10 analytics payload and anomaly endpoints are now available for UI integration.

## API Surfaces

1. `POST /billing/analytics-events`
2. `GET /billing/analytics-events`
3. `GET /billing/integrity-anomalies`

## UI-Relevant Payload Fields

1. Analytics events:
   - `eventName`, `eventVersion`, `planId`, `entitlementSnapshot`, `payloadValidationStatus`, `occurredAt`
2. Integrity anomalies:
   - `eventName`, `expectedPlanId`, `observedPlanId`, `correlationId`, `detectedAt`

## Verification

- `apps/api/src/app.test.ts`
- `npm run test`

If you need a condensed frontend view-model mapper for anomaly cards and timeline rows, I can add it next.
