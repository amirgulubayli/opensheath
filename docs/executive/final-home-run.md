# Final Home Run Plan (Remaining Work to Finish the App)

This document summarizes all remaining changes and tasks required to complete the app, close the spec.md requirements, and deliver a GA‑ready demo MVP. It is grounded in the codebase state as of 2026‑02‑07.

## 1) Current State Snapshot (What’s Done)

- **Contracts + domain logic**: strong coverage with tests in [packages/contracts/src](packages/contracts/src) and [packages/domain/src](packages/domain/src).
- **API**: full route surface exists in [apps/api/src/app.ts](apps/api/src/app.ts).
- **Web**: Next.js shell + working routes for sign‑in, dashboard, AI, retrieval, integrations, automation, notifications, and webhooks in [apps/web/app](apps/web/app).
- **Persistence**: Postgres scaffolding and migrations in [packages/persistence](packages/persistence), including domain tables and RLS.
- **Postgres wiring**: core services (workspace, projects, documents, integrations, automation, notifications, webhooks) now support Postgres when DATABASE_URL is provided.

Reference: [docs/executive/progress-summary.md](progress-summary.md)

## 2) Remaining Work (All Tasks to Finish)

### A) Persistence Completion (Retrieval + AI + Analytics + Billing Safeguards)

1. **Retrieval persistence**
   - Add Postgres implementation for retrieval indexing and citations.
   - Store embeddings + citation provenance in DB.
   - Replace in-memory retrieval service with Postgres-backed service.
   - Acceptance: retrieval UI uses DB‑backed results with citations.

2. **AI run persistence**
   - Persist agent runs and tool calls in DB.
   - Ensure AI run list and tool call list use persistent storage.
   - Acceptance: AI run history survives server restart.

3. **Analytics integrity + usage safeguards**
   - Persist usage counters and analytics events in DB.
   - Implement analytics ingestion endpoints and integrity checks.
   - Enforce demo usage limits in API + UI guards.
   - Acceptance: analytics dashboards show real counts; usage limits block overuse.

4. **Billing/entitlement enforcement (non‑monetized)**
   - Enforce ENABLE_BILLING=false in environments.
   - Validate entitlement checks across UI and API.
   - Acceptance: billing flows remain disabled; usage safeguards active.

### B) Ingestion Pipeline (Storage → Parse → Chunk → Embed → Index)

1. **Storage**
   - Add file upload endpoints and storage integration.
   - Store file metadata and link to document records.

2. **Parsing + chunking**
   - Parse uploaded files into chunks (text extraction).
   - Persist chunks in document_chunks table.

3. **Embeddings + indexing**
   - Generate embeddings and persist vector index.
   - Link chunks to retrieval service for query.

4. **Retry + dead‑letter + replay**
   - Add durable job queue (retry + DLQ) and replay UX.

Acceptance: ingestion status transitions reflect real pipeline stages end‑to‑end.

### C) Auth Provider Integration (Supabase/Auth.js)

1. **Replace in‑memory auth**
   - Wire OAuth + email/password to real provider.
   - Implement session refresh with provider tokens.

2. **UI auth flows**
   - Replace sign‑in placeholder with real OAuth buttons.
   - Add session refresh error handling.

Acceptance: real authentication flows in preview/staging.

### D) UI Completion (Full Spec Coverage)

1. **Workspace + membership UI**
   - Create/switch workspaces, invite members, role updates.
   - Use API endpoints wired to Postgres.

2. **Core workflow UI**
   - Project/document CRUD UI (create/edit/archive).
   - Activity timeline with persistent events.

3. **Ingestion UI**
   - File upload + status timeline.
   - Retry/dead‑letter replay actions.

4. **AI UX**
   - High‑risk confirmation modal and moderation denied UX.
   - AI run history and tool call details.

5. **Analytics UI**
   - Demo usage dashboard, integrity warnings.
   - Adoption event tracking views.

Acceptance: all feature routes in spec.md are accessible and functional.

### E) Automation + Notification Reliability

1. **Durable automation engine**
   - Use DB for idempotency and run history (done) + background queue.
   - Add replay/resume for failed rules.

2. **Webhook delivery**
   - Durable outbound delivery worker.
   - Replay + audit logs for failures.

Acceptance: automation and webhook replay are durable across restarts.

### F) Observability + Security Hardening

1. **Observability stack**
   - OpenTelemetry traces, logs, metrics.
   - Sentry (or equivalent) error ingestion.
   - Alert thresholds for auth, AI, ingestion, automation.

2. **Security hardening**
   - CSRF/SSRF protections, security headers, input sanitization.
   - Dependency scanning, secret scanning, threat model.

Acceptance: security checklist complete; critical workflows observable.

### G) Release Readiness (Sprints 00–11 Evidence)

1. Populate gate evidence packets for each sprint.
2. Run regression suite and capture results.
3. Perform rollback rehearsal and finalize release checklist.

Acceptance: Beta + GA gate packets complete and signed off.

## 3) Final Execution Sequence (Mandatory Order)

1. Retrieval persistence
2. AI run persistence
3. Analytics + usage safeguards
4. Ingestion pipeline end‑to‑end
5. Auth provider integration
6. UI completion for workspaces + core workflows
7. UI completion for ingestion + AI + analytics
8. Automation + webhook durable workers
9. Observability + security hardening
10. Gate evidence + release readiness

## 4) Files/Areas That Must Change Next

- Retrieval persistence: [apps/api/src](apps/api/src), [packages/persistence/migrations](packages/persistence/migrations)
- AI persistence: [apps/api/src](apps/api/src), [packages/persistence/migrations](packages/persistence/migrations)
- Analytics + safeguards: [packages/domain/src/billing.ts](packages/domain/src/billing.ts), [apps/api/src/app.ts](apps/api/src/app.ts)
- Ingestion pipeline: [apps/api/src/app.ts](apps/api/src/app.ts), [packages/persistence/migrations](packages/persistence/migrations), [apps/web/app](apps/web/app)
- Auth integration: [apps/api/src](apps/api/src), [apps/web/app/sign-in/page.tsx](apps/web/app/sign-in/page.tsx)
- Observability + security: [apps/api/src/observability.ts](apps/api/src/observability.ts), [docs/05-engineering-playbooks](docs/05-engineering-playbooks)

## 5) Exit Criteria (Finish Line)

- All core flows work end‑to‑end with persistence:
  auth → workspace → project → ingest → retrieval → AI → automation → notifications → analytics.
- All release gates have real evidence packets.
- Security hardening complete with no critical issues.
- GA readiness sign‑off achieved.

## 6) Linked Sources

- Spec and master plan: [spec.md](../spec.md), [docs/executive/master-plan.md](master-plan.md)
- Mega epic: [docs/executive/epics/epic-06-productization-and-ga-convergence.md](epics/epic-06-productization-and-ga-convergence.md)
- Progress summary: [docs/executive/progress-summary.md](progress-summary.md)
