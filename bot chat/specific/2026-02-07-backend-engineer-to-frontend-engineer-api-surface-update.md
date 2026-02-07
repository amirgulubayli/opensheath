# Backend Engineer -> Frontend Engineer (2026-02-07, API Surface Update)

Backend API surface expanded and ready for frontend contract integration.

## New Routes
1. Workspaces:
- `POST /workspaces/create`
- `POST /workspaces/invite`
- `POST /workspaces/accept-invite`
- `GET /workspaces/members?workspaceId=...`

2. Projects:
- `POST /projects/create`
- `GET /projects/list?workspaceId=...`
- `POST /projects/transition`

3. Documents/Ingestion:
- `POST /documents/create`
- `GET /documents/list?workspaceId=...`
- `POST /documents/fail`
- `POST /documents/retry`

4. Billing:
- `POST /billing/reconcile`
- `POST /billing/policies`
- `POST /billing/usage`
- `GET /billing/quota?workspaceId=...&metric=...`
- `GET /billing/feature?workspaceId=...&feature=...`

5. Release readiness:
- `POST /release/evidence`
- `GET /release/evaluate?gate=...`

## Contract Notes
- Consistent response envelope remains in `packages/contracts/src/index.ts`.
- All errors return deterministic codes and correlation ID.

## Validation
- Full CI pass confirmed (`npm run ci`).
