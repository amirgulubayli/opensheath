# Executive Epics and Sprint Completion Plan

This document defines the remaining epics and a sprint-by-sprint completion plan that consolidates all lanes into a coherent finish path. It is aligned with the codebase-verified status in [docs/executive/progress-summary.md](progress-summary.md).

## Codebase Reality Check (2026-02-07)

- The system is a **domain + API prototype** with in-memory services and strong contracts.
- The web layer is **adapter logic only** (no Next.js UI application yet).
- Persistence, ingestion pipeline, and production observability are **not implemented**.

This means the remaining work is heavier than the original sprint narrative. The final mega epic below closes this gap.

## Executive Epics (Remaining)

### Epic 0: Lane Alignment and Evidence Normalization

**Goal:** get all lanes to the same readiness baseline and evidence standards so the remaining work can ship cleanly.

**Scope**
- Contract confirmation across all sprints (00-11).
- Gate evidence bundle population for sprints 00-03 and 04-07.
- Unified end-to-end flow map across backend, frontend, data, AI runtime.

**Acceptance Criteria**
- Every sprint has a populated gate evidence bundle.
- Every contract in data platform index has explicit ack status.
- End-to-end demo flow executes from UI to API for core workflows.

**Dependencies**
- DoR/DoD standards and testing playbook.
  - [docs/00-governance/definition-of-ready-and-done.md](../00-governance/definition-of-ready-and-done.md)
  - [docs/05-engineering-playbooks/testing-strategy.md](../05-engineering-playbooks/testing-strategy.md)

---

### Epic 1: Foundation and Auth Completion (Sprints 00-03)

**Goal:** close remaining gaps in architecture, CI/CD, auth shell, and tenant isolation.

**Scope**
- Tenant guard normalization in backend.
- Auth session refresh UI and error state coverage.
- RLS and data access checks for tenant isolation.

**Acceptance Criteria**
- Auth shell gate evidence complete.
- Tenant isolation gate evidence complete with negative tests.

---

### Epic 2: Core Domain + Ingestion Completion (Sprints 04-05)

**Goal:** deliver stable core workflows and ingestion lifecycle end-to-end.

**Scope**
- Project and document lifecycle UX wired to API.
- Activity timeline in UI and API.
- Ingestion state management and retry flows.

**Acceptance Criteria**
- Core workflow gate packet complete.
- Discovery gate packet complete.

---

### Epic 3: AI Runtime and Safety Completion (Sprints 06-07)

**Goal:** complete AI action safety and quality gates with evidence.

**Scope**
- Tool wrapper coverage for core domain operations.
- Moderation and high-risk action flows tested end-to-end.
- Retrieval/citation correctness validated in UI and API.

**Acceptance Criteria**
- AI action gate evidence packet complete.
- AI quality gate evidence packet complete.

---

### Epic 4: Integrations, Automation, and Notifications (Sprints 08-09)

**Goal:** complete connector lifecycle, automation engine, and webhook/notification UX.

**Scope**
- Connector diagnostics and health UI.
- Webhook delivery, replay, and dead-letter handling.
- Notification preference management.

**Acceptance Criteria**
- Automation gate packet complete.
- Notification/access sync gate packet complete.

---

### Epic 5: Analytics, Security Hardening, and GA Readiness (Sprints 10-11)

**Goal:** finalize analytics integrity, security controls, and release readiness.

**Scope**
- Usage safeguards and entitlement analytics for non-monetized scope.
- Security/compliance sign-off.
- Rollout and rollback evidence.

**Acceptance Criteria**
- Beta readiness gate packet complete.
- GA launch gate packet complete.

---

### Epic 6: Productization and GA Convergence (Mega Epic)

**Goal:** convert the in-memory prototype into a production-grade, end-to-end system that fully satisfies [spec.md](../../spec.md).

**Scope**
- Real Next.js web application using the existing adapter logic.
- Persistent data model (Postgres + migrations + RLS) aligned to domain services.
- Production ingestion pipeline (storage → parse → chunk → embed → index).
- Real AI gateway (Responses API + tools + structured outputs) with audit logs.
- Durable automation engine + webhook replay + notification preferences.
- Observability, security hardening, and release evidence completion.

**Acceptance Criteria**
- End-to-end UI → API flows for core, AI, ingestion, automation, and notifications.
- All release gates can be populated with real evidence artifacts.
- Spec.md requirements are demonstrably met with persistent storage and production-grade controls.

**Detail**
- [docs/executive/epics/epic-06-productization-and-ga-convergence.md](epics/epic-06-productization-and-ga-convergence.md)

## Sprint Completion Plan (Executive)

### Sprint 00 (Architecture Gate)

**Status:** partially documented, evidence needs consolidation.

**Finish Plan**
1. Assemble architecture gate evidence across lanes.
2. Confirm scope override and remove monetization flows from MVP.

### Sprint 01 (CI/CD Gate)

**Status:** CI pipeline and env validation implemented.

**Finish Plan**
1. Complete frontend preview deployment evidence.
2. Document CI gate evidence in release bundle.

### Sprint 02 (Auth Shell Gate)

**Status:** backend auth hardening and frontend auth shell modules implemented.

**Finish Plan**
1. Complete auth middleware normalization in backend.
2. Wire auth flows end-to-end from UI to API.
3. Add missing negative auth tests and evidence.

### Sprint 03 (Tenant Isolation Gate)

**Status:** RLS artifacts and tenant isolation partial checks in runtime.

**Finish Plan**
1. Validate tenant isolation for all domain routes.
2. Confirm observability endpoints and AI runtime metrics are tenant-scoped.
3. Produce tenant-isolation evidence bundle with negative tests.

### Sprint 04 (Core Workflow Gate)

**Status:** backend core workflows and AI tool wrappers implemented in-memory; UI is missing.

**Finish Plan**
1. Complete UI CRUD for projects and documents.
2. Ensure activity timeline flows and tests.
3. Add evidence for AI tool execution in core workflows.

### Sprint 05 (Discovery Gate)

**Status:** ingestion lifecycle and query contracts implemented in-memory; pipeline and UI are missing.

**Finish Plan**
1. Complete ingestion UI states and retry/dead-letter flows.
2. Validate retrieval query UX and citation rendering.
3. Close discovery gate evidence with full pipeline test.

### Sprint 06 (AI Action Gate)

**Status:** AI runtime tools and policy guards implemented in-memory; real model gateway missing.

**Finish Plan**
1. Expand tool wrapper coverage to remaining domain actions.
2. Add end-to-end AI action demo workflow and evidence.

### Sprint 07 (AI Quality Gate)

**Status:** retrieval/citation and moderation implemented in-memory, UI + evidence pending.

**Finish Plan**
1. Validate retrieval quality and citation correctness in UI.
2. Capture moderation policy evidence and alert thresholds.

### Sprint 08 (Automation Gate)

**Status:** integration/automation services and UI adapters implemented in-memory; durable jobs + UI missing.

**Finish Plan**
1. Complete connector diagnostics UI and automation run history UX.
2. Validate idempotency/retry handling and publish evidence.

### Sprint 09 (Notification/Access Sync Gate)

**Status:** webhook delivery/replay and preference APIs implemented in-memory; UI missing.

**Finish Plan**
1. Complete webhook replay UI and preference settings UI.
2. Validate notification and access sync flows with audit logs.

### Sprint 10 (Beta Readiness Gate)

**Status:** analytics integrity modeled in-memory; UI and enforcement missing.

**Finish Plan**
1. Finish analytics and entitlement UX, feature-flag guards.
2. Complete security hardening review and evidence.

### Sprint 11 (GA Launch Gate)

**Status:** contracts exist, evidence pending; production readiness not started.

**Finish Plan**
1. Finalize release and rollback checklists with DevOps/SRE.
2. Run full regression suite and provide GA launch packet.

## Final Note

This plan is intentionally sequential. If capacity allows, Sprint 08-10 tasks can be batched after Sprint 04-07 evidence is stable, but GA readiness requires all gates to be closed in order.
