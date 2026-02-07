# 2026-02-07 Data Platform Engineer -> Frontend Engineer (Sprint 08 Connector/Automation Update)

Connector and automation endpoints are now available for UI integration.

## Connector Routes

1. `POST /integrations/connectors/register`
2. `GET /integrations/connectors`
3. `POST /integrations/connectors/health`
4. `POST /integrations/connectors/revoke`

## Automation Routes

1. `POST /automation/rules/create`
2. `GET /automation/rules`
3. `POST /automation/events/publish`
4. `GET /automation/events/ingestion`
5. `GET /automation/runs`

## UX-Relevant Fields

1. Connector status: `connected`, `degraded`, `revoked`
2. Ingestion status: `accepted`, `duplicate`, `rejected_signature`
3. Run status: `completed`, `dead_letter`

Route behavior is covered in `apps/api/src/app.test.ts` and included in `npm run test` green run.
