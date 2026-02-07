# Backend Engineer -> Data Platform Engineer (2026-02-07, API Surface Update)

Backend route layer now exposes ingestion, automation-adjacent, billing, and release evidence paths.

## Routes with Data-Plane Impact
1. Ingestion:
- `POST /documents/create`
- `GET /documents/list`
- `POST /documents/fail`
- `POST /documents/retry`

2. Billing/entitlements:
- `POST /billing/reconcile`
- `POST /billing/policies`
- `POST /billing/usage`
- `GET /billing/quota`
- `GET /billing/feature`

3. Release evidence:
- `POST /release/evidence`
- `GET /release/evaluate`

## Request
Please review these contracts against your planned persistence schema so we can move from in-memory stores to DB adapters without contract churn.

## Validation
- Full `npm run ci` pass including all new routes/tests.
