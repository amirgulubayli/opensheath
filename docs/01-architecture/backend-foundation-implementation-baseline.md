# Backend Foundation Implementation Baseline (2026-02-07)

## Purpose
Document the executable backend baseline created from Sprint 01 dependency order, with staged domain modules and API exposure aligned to Sprints 02-11.

## Implemented Code Surface

### Workspace and Build System
- Root workspace scripts in `package.json`:
  - `lint`, `validate:env`, `build`, `typecheck`, `test`, `ci`
- Shared TypeScript baseline in `tsconfig.base.json`
- Architecture guard script in `scripts/validate-architecture.mjs`
- Environment validation script in `scripts/validate-env.mjs`

### Contracts Package (`@ethoxford/contracts`)
- File: `packages/contracts/src/index.ts`
- Delivered:
  - API success/error envelope
  - Event envelope contract
  - Health and auth DTOs (email/password, OAuth exchange, session refresh)
  - Contract version constant

### Domain Package (`@ethoxford/domain`)
- Public entry: `packages/domain/src/index.ts`
- Delivered modules:
  - `auth.ts`: sign-up/sign-in, OAuth account linking, session refresh rotation, and session lifecycle service
  - `identity.ts`: workspace membership, invite flow, role permissions
  - `core.ts`: project workflow and status transitions
  - `ingestion.ts`: retry/dead-letter ingestion lifecycle
  - `ai-runtime.ts`: tool registry and action execution loop
  - `integrations.ts`: canonical event bus and automation retries/idempotency
  - `billing.ts`: lifecycle reconciliation + usage/quota checks (feature-flagged for non-monetized MVP)
  - `release.ts`: release-gate evidence evaluator

### API Package (`@ethoxford/api`)
- Files:
  - `apps/api/src/app.ts`
  - `apps/api/src/server.ts`
  - `apps/api/src/env.ts`
- Routes implemented:
  - `GET /health`
  - `POST /auth/sign-in`
  - `POST /auth/sign-up`
  - `POST /auth/oauth/exchange`
  - `POST /auth/session/refresh`
  - `GET /auth/me`
  - `POST /auth/sign-out`
  - `POST /workspaces/create`
  - `POST /workspaces/invite`
  - `POST /workspaces/accept-invite`
  - `GET /workspaces/members`
  - `POST /projects/create`
  - `GET /projects/list`
  - `POST /projects/transition`
  - `POST /documents/create`
  - `GET /documents/list`
  - `POST /documents/fail`
  - `POST /documents/retry`
  - `POST /ai/execute`
  - `POST /billing/reconcile` (kept for compatibility, disabled when `ENABLE_BILLING=false`)
  - `POST /billing/policies` (kept for compatibility, disabled when `ENABLE_BILLING=false`)
  - `POST /billing/usage` (kept for compatibility, disabled when `ENABLE_BILLING=false`)
  - `GET /billing/quota` (kept for compatibility, disabled when `ENABLE_BILLING=false`)
  - `GET /billing/feature` (kept for compatibility, disabled when `ENABLE_BILLING=false`)
  - `POST /release/evidence`
  - `GET /release/evaluate`

## Story/Sprint Alignment Snapshot
- Sprint 01: `F1-E1-S2`, `F1-E1-S3`, `F1-E2-S2` baseline implemented.
- Sprint 02-11: backend domain and API baseline routes in place for identity, core workflows, ingestion, AI action, integrations/demo-governance, and release evidence flows.

## Validation Evidence
- Command: `npm run ci`
- Result: pass
- Coverage type: contracts, env validation, domain service logic (positive and negative paths), and expanded API route tests.

## Next Increment
1. Consolidate shared auth middleware and tenant-scoped guard helpers across all protected routes.
2. Introduce persistence adapters to replace in-memory stores in dependency order.
3. Expand route-level observability contract docs and gate evidence packets for day-9 handoff.
