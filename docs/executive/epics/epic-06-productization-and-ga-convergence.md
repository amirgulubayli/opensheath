# Epic 06: Productization and GA Convergence (Mega Epic)

## Goal

Convert the current in-memory prototype into a production-grade, end-to-end product that fully satisfies [spec.md](../../../spec.md) and closes Sprint 00–11 gates with real evidence.

## Why This Epic Exists

The codebase is currently a strong domain + API prototype with adapter logic. This epic turns that prototype into a complete, demo-ready product with real UI, persistence, ingestion, AI runtime integration, automation, observability, and security hardening.

## Scope (What Must Ship)

1. **Web UI (Next.js)**
   - Real application shell, authenticated routing, workspace switching, and complete UX for core workflows.
2. **Persistence Layer (Postgres + pgvector)**
   - Database schema, migrations, RLS policies, and repository services aligned to domain logic.
3. **Auth Integration**
   - Supabase/Auth.js integration with OAuth providers and session refresh.
4. **Ingestion Pipeline**
   - Storage ingestion, parsing, chunking, embedding, indexing, and retry/replay.
5. **AI Gateway + Tools**
   - OpenAI Responses API integration with structured outputs, tool registry, audit logs, and safety enforcement.
6. **Automation + Integrations**
   - Durable eventing, automation rules, idempotency, and connector health flows.
7. **Notifications**
   - Notification preferences, webhook delivery, replay tools, and access sync.
8. **Analytics + Safeguards**
   - Usage limits, analytics integrity, demo access lifecycle.
9. **Observability + Security**
   - OTel + Sentry integration, alerts, security hardening, compliance evidence.
10. **Release Readiness**
   - Gate evidence, runbooks, regression tests, rollback rehearsal, GA launch packet.

## Out of Scope (Explicit)

- Monetized billing flows (must remain disabled per scope override).
- Enterprise SSO and advanced compliance frameworks beyond baseline hardening.

## Dependencies

- Epic 00–05 artifacts and contract alignment.
- Defined DoR/DoD and testing strategy.
  - [docs/00-governance/definition-of-ready-and-done.md](../../00-governance/definition-of-ready-and-done.md)
  - [docs/05-engineering-playbooks/testing-strategy.md](../../05-engineering-playbooks/testing-strategy.md)

## Deliverables

- A fully functioning web app and API backed by persistent storage.
- Complete ingestion and retrieval workflow with citations in UI.
- AI action flows with tool execution, moderation enforcement, and audit logs.
- Automation, webhook replay, and notification preference UX.
- Analytics integrity and demo access lifecycle implemented.
- Security hardening evidence and GA readiness packets.

## Workstream Story Map (Mega Story Breakdown)

## Step-by-Step Execution Story (Ordered, Finish-Line Path)

This is the mandatory execution order to reach full spec.md compliance. Each step must produce tangible evidence before moving forward.

1) **Foundation Lock (Contracts + Scope)**
   - Freeze contracts and event schemas.
   - Confirm non-monetized scope enforcement.
   - Evidence: contract index update + scope confirmation note.

2) **Web App Bootstrap (Next.js)**
   - Create Next.js app shell and route map.
   - Implement auth gate + workspace switcher UX shell.
   - Evidence: UI walkthrough + routing tests.

3) **Persistence Baseline (Postgres + Migrations)**
   - Implement schema and migrations for all core entities.
   - Apply RLS policies for tenant isolation.
   - Evidence: migration files + RLS policy tests.

4) **Auth Provider Integration**
   - Wire Supabase/Auth.js OAuth and session refresh.
   - Replace in-memory auth paths in API.
   - Evidence: auth flow logs + UI tests.

5) **Core Domain CRUD (UI → API → DB)**
   - Projects, documents, activity timeline end-to-end.
   - Evidence: E2E tests + audit/event logs.

6) **Ingestion Pipeline (Storage → Parse → Embed → Index)**
   - Storage upload, chunking, embeddings, indexing.
   - Retry/dead-letter with replay UX.
   - Evidence: pipeline logs + UI status timeline.

7) **Retrieval + Citations (UI + API)**
   - Retrieval UI with citations and confidence bands.
   - Evidence: retrieval tests + evidence panel screenshots.

8) **AI Runtime Integration**
   - OpenAI Responses API with tool execution + audit logs.
   - Moderation enforcement + high-risk confirmation UX.
   - Evidence: AI run logs + moderation tests.

9) **Automation + Integrations**
   - Durable event bus, rule engine, connector lifecycle.
   - Evidence: automation run history + connector health UI.

10) **Notifications + Webhook Replay**
    - Preference management, webhook signing, replay UI.
    - Evidence: replay logs + delivery evidence.

11) **Analytics + Usage Safeguards**
    - Usage limits, analytics integrity, demo access lifecycle.
    - Evidence: dashboard + enforcement tests.

12) **Observability + Security Hardening**
    - OTel, Sentry, alerts, threat model, security headers.
    - Evidence: dashboards + scan reports.

13) **Release Readiness + GA Evidence**
    - Gate packets for Sprints 00–11 with real artifacts.
    - Evidence: release checklist + rollback drill.

14) **Final End-to-End Demo Run**
    - Validate full flow: auth → workspace → project → ingest → retrieval → AI → automation → notifications → analytics.
    - Evidence: recorded demo run + signed-off gate packet.

### A) Platform + Web App Foundation

**E6-A1: Next.js App Shell**
- Build Next.js app with layout, routing, auth gate, and workspace switcher.
- AC: User can sign in, select workspace, and reach dashboard.
- Evidence: UI walkthrough + routing tests.

**E6-A2: UI Surface Completion**
- Implement screens for projects, documents, ingestion lifecycle, AI runs, integrations, notifications.
- AC: Every core workflow has a visible UI route and empty/error/loading states.
- Evidence: UI snapshots + Cypress/Playwright smoke tests.

**E6-A3: Design System + Error States**
- Standardize error, empty, loading, and blocked-policy states.
- AC: All routes use consistent UX and error taxonomy.
- Evidence: UI component inventory + tests.

### B) Persistence + Data Access

**E6-B1: Postgres Schema + Migrations**
- Translate domain entities to DB schema with workspace scoping.
- AC: All entities from spec are represented with migrations.
- Evidence: Migration files + schema diagram.

**E6-B2: RLS Policies + Tenant Isolation**
- Implement RLS policies for all tenant-owned tables.
- AC: Negative tests prove zero cross-tenant leakage.
- Evidence: Authz regression test report + gate packet.

**E6-B3: Repository Layer + Services**
- Replace in-memory services with persistence-backed implementations.
- AC: API routes use repository layer; no in-memory data paths in prod.
- Evidence: Service wiring map + tests.

### C) Auth + Identity

**E6-C1: Auth Provider Integration**
- Implement OAuth and email/password with session refresh.
- AC: Sign-up/sign-in flows with real provider tokens.
- Evidence: Auth flow logs + UI tests.

**E6-C2: Workspace Memberships**
- Implement invite, role assignment, and membership lifecycle.
- AC: Role changes propagate to UI and API permissions.
- Evidence: Membership tests + UI flow evidence.

### D) Core Domain + UX

**E6-D1: Project & Document CRUD**
- UI + API CRUD with activity timeline and audit logs.
- AC: Full create/edit/archive flow with activity feed.
- Evidence: E2E tests + event logs.

**E6-D2: Search + Filters + Saved Views**
- Implement search and saved views aligned to spec.
- AC: Users can filter and save views per workspace.
- Evidence: UI tests + API query tests.

### E) Ingestion + Retrieval

**E6-E1: Ingestion Pipeline**
- File upload → parse → chunk → embed → index.
- AC: Document status transitions match domain model and UI shows progress.
- Evidence: Pipeline logs + status timeline.

**E6-E2: Retrieval API + Citations**
- Hybrid search + citation provenance storage.
- AC: AI answers show citations with confidence bands.
- Evidence: Retrieval tests + UI evidence panel.

**E6-E3: Retry + Dead-letter + Replay**
- Durable retry queues and dead-letter replays.
- AC: Operators can replay dead-lettered documents.
- Evidence: Replay audit log + UI workflow evidence.

### F) AI Runtime + Safety

**E6-F1: AI Gateway Integration**
- OpenAI Responses API with structured outputs and tool calls.
- AC: Tool calls execute with guardrails and auditable records.
- Evidence: AI run logs + structured output conformance tests.

**E6-F2: Safety Enforcement**
- Moderation checks, high-risk confirmations, refusal handling.
- AC: High-risk tools require explicit confirmation; blocked actions show UX states.
- Evidence: Moderation tests + UX snapshots.

**E6-F3: AI Quality + Evals**
- Evals dataset + thresholds + rollback playbook.
- AC: Quality thresholds are defined and met.
- Evidence: Eval report + threshold dashboard.

### G) Integrations + Automation

**E6-G1: Connector Lifecycle**
- OAuth/API key connectors with health checks and revocation.
- AC: Connector status visible and updated.
- Evidence: Health check logs + UI status cards.

**E6-G2: Automation Engine**
- Durable event bus, rule engine, idempotency, retries.
- AC: Event → rule → action success path works with retries.
- Evidence: Automation run history + tests.

### H) Notifications + Access Sync

**E6-H1: Notification Preferences**
- User settings for email/in-app/webhook preferences.
- AC: Preferences stored and applied on delivery.
- Evidence: UI settings tests + delivery logs.

**E6-H2: Webhook Delivery + Replay**
- Signed webhooks, delivery logs, replay UI.
- AC: Failed webhooks can be replayed with audit logs.
- Evidence: Replay audit record + UI evidence.

### I) Analytics + Demo Safeguards

**E6-I1: Usage Limits + Safeguards**
- Enforce usage limits and demo access lifecycle.
- AC: Limits enforced consistently at API and UI.
- Evidence: Policy enforcement tests + dashboard.

**E6-I2: Analytics Integrity**
- Event taxonomy, ingestion, dashboards.
- AC: Adoption metrics visible with integrity checks.
- Evidence: Analytics dashboard + validation logs.

### J) Observability + Security + Release

**E6-J1: Observability Stack**
- OpenTelemetry traces + logs, Sentry errors, alert routing.
- AC: Critical workflows have traces and alerts.
- Evidence: OTel traces + alert screenshots.

**E6-J2: Security Hardening**
- CSRF/SSRF, security headers, dependency scanning, threat model.
- AC: Security review signed-off with no criticals.
- Evidence: Security report + scan results.

**E6-J3: Release Readiness**
- Gate packets, regression suite, rollback drills, GA runbook.
- AC: Sprint 10–11 gates complete with evidence.
- Evidence: Gate packet PDFs + release checklist.

## Definitions of Ready/Done (Epic Level)

**Ready if:**
- Contracts are finalized and versioned.
- Data model agreed and migration plan drafted.
- Dependencies and rollout risks documented.

**Done if:**
- All gate packets populated with real evidence.
- End-to-end UI → API → DB flows validated.
- Security/compliance sign-off completed.
- GA launch packet approved.

## Evidence Required (Checklist)

- UI walkthroughs and E2E tests for all core flows.
- Database migrations + RLS policy evidence.
- AI run and tool call audit logs.
- Ingestion and retrieval pipeline logs with citations.
- Automation run history and webhook replay evidence.
- Observability dashboards, alert thresholds, and runbooks.
- Security scan results and threat model documentation.
- Release readiness checklist and rollback rehearsal notes.

## Risks

- UI work is larger than expected due to missing app scaffolding.
- Data model drift between in-memory services and persistent schema.
- AI quality gates require eval datasets and dedicated validation time.
- Release readiness blocked without security/compliance evidence.

## Exit Criteria

- All Sprint 00–11 gates have complete evidence packets.
- Core end-to-end demo flow passes: auth → workspace → project → ingest → retrieval → AI → automation → notifications → analytics.
- GA readiness sign-off completed with no critical blockers.
