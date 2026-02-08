# User Testing Run Log (2026-02-08)

Scope: Sections 1–3 (API-driven checks) from docs/05-engineering-playbooks/user-testing-guide.md.

## 1) Environment and Preconditions

### 1.1 Local services
- [x] Start DB: docker compose up -d (container ethoxford-postgres running).
- [x] API dev server: already running on port 4040 (port in use when attempting to start).
- [x] Web dev server: landing route returned HTTP 200 on http://localhost:3001/.

### 1.2 Validate environment + policies
- [x] Validate env: npm run validate:env (passed).
- [x] Validate AI runtime policy: npm run validate:ai-runtime (passed earlier in session).

### 1.3 Baseline checks (smoke)
- [x] API responds on /health (http://localhost:4040/health).
- [x] Web app loads and reaches landing route (HTTP 200 on http://localhost:3001/).
- [x] App connects to DB and performs a simple query: POST /workspaces/create succeeded after schema init.
  - Note: schema was missing initially; applied migration via direct psql run of packages/persistence/migrations/001_init.sql.

### 1.4 Test data
- [x] Deterministic fixtures created:
  - Users: admin@example.com (usr_default), member@example.com (usr_21058f63...), member2@example.com (usr_b5cfeb35...).
  - Workspaces: Workspace Alpha (ws_27084ede...), Workspace Beta (ws_605aba8e...).
  - Roles in Workspace Alpha: owner (usr_default), admin (usr_21058f63...), member (usr_b5cfeb35...).

## Issues / Remediation
- Initial DB schema missing; resolved by applying SQL migration directly through psql. Consider adjusting the migration script to load DATABASE_URL from .env or to resolve migrations relative to the package path when run from repo root.
- Workspace invite authorization missing for Postgres path; enforced owner/admin check in API route.
- AI observability endpoints crashed due to missing awaits in /metrics/ai and /alerts/ai; fixed by awaiting async runtime calls.
- Retrieval citations failed before retrieval migration; applied packages/persistence/migrations/002_retrieval.sql.
- Document completion failed when status was retrying; resolved by reprocessing before completion.

## 2) Universal Test Checklist (API)

### 2.1 Functional positive flow
- [x] Core API flows executed without manual DB fixes after migrations.
- [x] API responses returned expected success payloads for create/update/list/transition actions.

### 2.2 Negative and boundary tests
- [x] Non-admin invite now rejected (policy_denied).
- [x] Cross-tenant member list blocked (policy_denied).

### 2.3 Observability checks
- [x] /metrics responds with snapshot.
- [x] /metrics/ai and /alerts/ai respond after fixes.
- [x] /alerts/auth and /alerts/tenant respond with evaluation payloads.

## 3) Feature-Based API Validation

### Feature 02: Identity, Tenant Model, and Access Control
- [x] Auth: sign-in, /auth/me, refresh, sign-out; invalid session returns 401.
- [x] Workspaces: create, invite, accept, list members, update role, remove member.
- [x] Negative: member invite blocked after fix; cross-tenant list blocked.

### Feature 03: Core Domain and User Workflows
- [x] Projects: create, list, update, transition, activity.
- [x] Documents: create, upload, processing, fail, retry, complete, list, activity.

### Feature 04: AI Assistant and Agent Runtime
- [x] /ai/execute (echo tool), /ai/runs, /ai/tool-calls.
- [x] AI observability: /metrics/ai, /alerts/ai.

### Feature 05: Knowledge Ingestion and Retrieval
- [x] Ingestion upload -> chunking + indexing.
- [x] Retrieval query and citations (POST + GET).

### Feature 06: Integrations and Automation
- [x] Connectors: register, health update, list, revoke.
- [x] Automation: rule create/list, event publish, ingestion list, runs list.
- [x] Notifications: preferences update/get/list.
- [x] Webhooks: enqueue, attempt, replay, list.

### Feature 08: Operations, Security, and Launch
- [x] Release readiness: evidence record, authz regression record, evaluate, dashboard.

## Next Steps
- Proceed with UI walkthroughs for Section 2/3 items that require browser interactions.