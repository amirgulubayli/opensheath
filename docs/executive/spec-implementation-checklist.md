# Spec Implementation Checklist (Deep Sweep)

Date: 2026-02-07

## Scope of sweep (code + config)
- API: apps/api/src
- Web UI: apps/web/app + apps/web/src
- Domain/contracts/persistence: packages/contracts, packages/domain, packages/persistence
- CI + validation scripts: .github/workflows, scripts
- DB schema: packages/persistence/migrations

## Legend
- [x] Implemented
- [ ] Not found
- [ ] Partial (explicitly noted)

## Capability checklist aligned to spec.md

### Feature 1: Platform Foundation & Engineering System
- [x] Monorepo with contracts/domain/persistence packages and shared types. Evidence: [package.json](package.json#L1-L24), [packages/contracts/src/index.ts](packages/contracts/src/index.ts#L1-L200), [packages/domain/src/index.ts](packages/domain/src/index.ts#L1-L10), [packages/persistence/src/index.ts](packages/persistence/src/index.ts#L1-L2)
- [x] Architecture guardrails enforcing dependency boundaries. Evidence: [scripts/validate-architecture.mjs](scripts/validate-architecture.mjs#L1-L120)
- [x] CI quality gate wired to lint/validate/typecheck/test/build. Evidence: [package.json](package.json#L6-L20), [.github/workflows/ci.yml](.github/workflows/ci.yml#L1-L27)
- [x] Env validation for AI and billing flags. Evidence: [scripts/validate-env.mjs](scripts/validate-env.mjs#L1-L58)

### Feature 1 (Observability Foundation)
- [x] Structured logging + request metrics with per-route aggregates. Evidence: [apps/api/src/observability.ts](apps/api/src/observability.ts#L1-L190)
- [x] Metrics and alert endpoints for auth, tenant isolation, and AI runtime. Evidence: [apps/api/src/server.ts](apps/api/src/server.ts#L847-L1175)
- [x] AI alert thresholds and runbook validation guard. Evidence: [apps/api/src/ai-observability.ts](apps/api/src/ai-observability.ts#L1-L210), [scripts/validate-ai-runtime-policy.mjs](scripts/validate-ai-runtime-policy.mjs#L1-L120)

### Feature 2: Identity, Tenant Model, and Access Control
- [x] Auth flows (sign-in, sign-up, OAuth exchange, session refresh, session lookup, sign-out). Evidence: [apps/api/src/app.ts](apps/api/src/app.ts#L760-L856), [packages/domain/src/auth.ts](packages/domain/src/auth.ts#L1-L200)
- [x] Workspace lifecycle (create, invite, accept invite, list members, update role, remove member). Evidence: [apps/api/src/app.ts](apps/api/src/app.ts#L873-L1000), [packages/domain/src/identity.ts](packages/domain/src/identity.ts#L1-L200)
- [x] Authorization enforcement via `buildMemberContext()` and role checks. Evidence: [apps/api/src/app.ts](apps/api/src/app.ts#L430-L535)
- [x] Tenant isolation via RLS + session/workspace binding in API and Postgres `set_config`. Evidence: [packages/persistence/migrations/001_init.sql](packages/persistence/migrations/001_init.sql#L300-L350), [apps/api/src/persistence-services.ts](apps/api/src/persistence-services.ts#L18-L60), [apps/api/src/app.ts](apps/api/src/app.ts#L430-L535)
- [ ] Demo access lifecycle state model and transitions (spec F7-E1). Found only schema scaffolding; no runtime usage. Evidence: [packages/persistence/migrations/001_init.sql](packages/persistence/migrations/001_init.sql#L226-L240)

### Feature 3: Core Product Domain & UX Workflows
- [x] Projects CRUD + status transitions + activity timeline. Evidence: [apps/api/src/app.ts](apps/api/src/app.ts#L1003-L1095), [packages/domain/src/core.ts](packages/domain/src/core.ts#L1-L200)
- [x] Documents CRUD + ingestion status + activity timeline. Evidence: [apps/api/src/app.ts](apps/api/src/app.ts#L1115-L1305), [packages/domain/src/ingestion.ts](packages/domain/src/ingestion.ts#L1-L220)
- [x] Dashboard UX for create/list projects and upload/index documents. Evidence: [apps/web/app/dashboard/page.tsx](apps/web/app/dashboard/page.tsx#L1-L200)
- [ ] Items/tasks domain entities (spec F3-E1) not found in domain/API/UI.
- [ ] Search/filter/saved views for core domain (spec F3-E3) not found in API/UI.

### Feature 4: AI Assistant and Agent Runtime
- [x] Tool registry with role and risk gating. Evidence: [apps/api/src/server.ts](apps/api/src/server.ts#L80-L520), [packages/domain/src/ai-runtime.ts](packages/domain/src/ai-runtime.ts#L1-L220)
- [x] AI execution endpoint with quota checks and tool call recording. Evidence: [apps/api/src/app.ts](apps/api/src/app.ts#L1868-L1959)
- [x] AI run + tool call listing endpoints and UI. Evidence: [apps/api/src/app.ts](apps/api/src/app.ts#L1931-L1959), [apps/web/app/ai/page.tsx](apps/web/app/ai/page.tsx#L1-L160)
- [ ] Partial: LLM gateway integration (OpenAI Responses API) not present; runtime is in-memory tool executor only. Evidence: [packages/domain/src/ai-runtime.ts](packages/domain/src/ai-runtime.ts#L1-L220), [apps/api/src/env.ts](apps/api/src/env.ts#L1-L105)

### Feature 5: Knowledge Ingestion & Retrieval
- [x] Ingestion pipeline with upload → chunk → index → complete/fail → retry. Evidence: [apps/api/src/app.ts](apps/api/src/app.ts#L1115-L1305), [packages/domain/src/ingestion.ts](packages/domain/src/ingestion.ts#L1-L220)
- [x] Retrieval API (index chunks, query, citations). Evidence: [apps/api/src/app.ts](apps/api/src/app.ts#L1326-L1477), [packages/domain/src/retrieval.ts](packages/domain/src/retrieval.ts#L1-L220)
- [x] Retrieval UI for indexing/query. Evidence: [apps/web/app/retrieval/page.tsx](apps/web/app/retrieval/page.tsx#L1-L140)
- [ ] Partial: File storage integration (e.g., Supabase Storage) not found; ingestion uses request body content only.

### Feature 6: Integrations and Automation
- [x] Connector lifecycle (register, list, health, revoke). Evidence: [apps/api/src/app.ts](apps/api/src/app.ts#L1488-L1549), [packages/domain/src/integrations.ts](packages/domain/src/integrations.ts#L1-L200)
- [x] Event bus ingestion with dedupe and signature handling. Evidence: [packages/domain/src/integrations.ts](packages/domain/src/integrations.ts#L1-L120)
- [x] Automation rules + event publish + runs list. Evidence: [apps/api/src/app.ts](apps/api/src/app.ts#L1564-L1677)
- [x] Automation UI for rules, ingestion records, and run history. Evidence: [apps/web/app/automation/page.tsx](apps/web/app/automation/page.tsx#L1-L200)
- [x] Integration UI for connector registration and status. Evidence: [apps/web/app/integrations/page.tsx](apps/web/app/integrations/page.tsx#L1-L140)

### Feature 6 (Notifications + Webhooks)
- [x] Notification preferences (update, get, list) with role gating. Evidence: [apps/api/src/app.ts](apps/api/src/app.ts#L1694-L1740), [packages/domain/src/integrations.ts](packages/domain/src/integrations.ts#L200-L360)
- [x] Outbound webhook queue, attempts, replay, list. Evidence: [apps/api/src/app.ts](apps/api/src/app.ts#L1770-L1849), [packages/domain/src/integrations.ts](packages/domain/src/integrations.ts#L360-L520)
- [x] Notifications and webhooks UI. Evidence: [apps/web/app/notifications/page.tsx](apps/web/app/notifications/page.tsx#L1-L140), [apps/web/app/webhooks/page.tsx](apps/web/app/webhooks/page.tsx#L1-L120)
- [ ] Partial: No email/in-app delivery provider integration found; only preference storage and webhook delivery state.

### Feature 7: Demo Governance, Usage Safeguards, and Adoption Loops
- [x] Usage quotas + entitlement gating via billing service. Evidence: [apps/api/src/app.ts](apps/api/src/app.ts#L1966-L2068), [packages/domain/src/billing.ts](packages/domain/src/billing.ts#L1-L220)
- [x] Analytics events + integrity anomaly listing. Evidence: [apps/api/src/app.ts](apps/api/src/app.ts#L2079-L2195), [packages/domain/src/billing.ts](packages/domain/src/billing.ts#L200-L360)
- [x] Analytics UI for quota, events, anomalies. Evidence: [apps/web/app/analytics/page.tsx](apps/web/app/analytics/page.tsx#L1-L120)
- [ ] Usage policy model and runtime enforcement not found (schema only). Evidence: [packages/persistence/migrations/001_init.sql](packages/persistence/migrations/001_init.sql#L235-L245)

### Feature 8: Operations, Security, Compliance, and Launch
- [x] Security headers on API responses. Evidence: [apps/api/src/server.ts](apps/api/src/server.ts#L70-L110)
- [x] Release readiness evidence + authz regression tracking endpoints. Evidence: [apps/api/src/app.ts](apps/api/src/app.ts#L2212-L2296), [packages/domain/src/release.ts](packages/domain/src/release.ts#L1-L200)
- [x] Audit log writes for membership invites/acceptance (partial coverage). Evidence: [apps/api/src/persistence-services.ts](apps/api/src/persistence-services.ts#L400-L470)
- [ ] Audit coverage for AI actions, webhooks, billing, and other privileged operations not found.
- [ ] Reliability/performance SLOs, load testing, and incident runbooks are not present in code (docs only).

## App UI surface map (what the UI can do)
- [x] App shell with navigation and auth awareness. Evidence: [apps/web/src/app-shell.ts](apps/web/src/app-shell.ts#L1-L110), [apps/web/app/layout.tsx](apps/web/app/layout.tsx#L1-L70)
- [x] Sign-in page (email/password demo). Evidence: [apps/web/app/sign-in/page.tsx](apps/web/app/sign-in/page.tsx#L1-L120)
- [x] Dashboard (projects, document upload/index, quick links). Evidence: [apps/web/app/dashboard/page.tsx](apps/web/app/dashboard/page.tsx#L1-L200)
- [x] Workspaces (create, invite, accept, role update, remove, list members). Evidence: [apps/web/app/workspaces/page.tsx](apps/web/app/workspaces/page.tsx#L1-L200)
- [x] AI actions (execute tool, view runs/tool calls). Evidence: [apps/web/app/ai/page.tsx](apps/web/app/ai/page.tsx#L1-L160)
- [x] Retrieval (index chunk, query results). Evidence: [apps/web/app/retrieval/page.tsx](apps/web/app/retrieval/page.tsx#L1-L140)
- [x] Automation (create rule, publish event, review rules/runs/ingestion). Evidence: [apps/web/app/automation/page.tsx](apps/web/app/automation/page.tsx#L1-L200)
- [x] Integrations (register connector, list status). Evidence: [apps/web/app/integrations/page.tsx](apps/web/app/integrations/page.tsx#L1-L140)
- [x] Notifications (update preferences, list workspace prefs). Evidence: [apps/web/app/notifications/page.tsx](apps/web/app/notifications/page.tsx#L1-L140)
- [x] Webhooks (list deliveries, replay). Evidence: [apps/web/app/webhooks/page.tsx](apps/web/app/webhooks/page.tsx#L1-L120)
- [x] Analytics (quota, events, anomalies). Evidence: [apps/web/app/analytics/page.tsx](apps/web/app/analytics/page.tsx#L1-L120)
- [x] Settings hub linking to integrations/automation/notifications/webhooks. Evidence: [apps/web/app/settings/page.tsx](apps/web/app/settings/page.tsx#L1-L60)
