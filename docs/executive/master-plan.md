# Master Executive Plan (Full Step-by-Step)

This plan completes the demo MVP per [spec.md](../../spec.md) and the sprint roadmap in [docs/04-sprints/sprint-roadmap.md](../04-sprints/sprint-roadmap.md). It assumes the non-monetized scope override remains active.

## Current Codebase Status (Reality Check)

The repository is a **domain + API prototype** with in-memory services and adapter logic. There is no production-grade web UI, persistence layer, or ingestion pipeline yet. See [docs/executive/progress-summary.md](progress-summary.md) for the full, codebase-verified assessment.

## 0) Operating Rules

- Follow DoR/DoD for every story: [docs/00-governance/definition-of-ready-and-done.md](../00-governance/definition-of-ready-and-done.md)
- Testing standards and release gates apply to every sprint: [docs/05-engineering-playbooks/testing-strategy.md](../05-engineering-playbooks/testing-strategy.md), [docs/05-engineering-playbooks/release-and-rollout-playbook.md](../05-engineering-playbooks/release-and-rollout-playbook.md)
- Scope override for MVP must be enforced: [docs/00-governance/demo-mvp-scope-overrides.md](../00-governance/demo-mvp-scope-overrides.md)

## 1) North-Star Delivery Objective

Deliver a tenant-safe, AI-enabled web platform with:
1. Auth + workspace/membership model,
2. Core workflow creation and activity tracking,
3. Ingestion + retrieval + citations,
4. AI runtime with tool execution, safety, and observability,
5. Integrations, automation, and notifications,
6. Analytics and operational hardening,
7. Release gates and GA readiness.

## 2) Executive Step-by-Step Path

### Step 1: Normalize Evidence and Stabilize Dependencies (Immediate)

**Outcome:** consistent readiness across all lanes and sprints.

- Consolidate all lane evidence into sprint gate bundles for 00-03.
- Confirm and record contract acceptance for 00-11 across backend, frontend, data platform, AI runtime, DevOps/SRE, and security/compliance.
- Resolve any mismatched contract payloads before further UI/flow wiring.
- Validate non-monetized gates and disable payment flows behind feature flags.

**Deliverables:**
- Updated gate evidence packets per sprint in their respective lanes.
- Contract confirmation log updated for each sprint.
- A single “end-to-end path” map: auth → workspace → project → ingest → retrieval → AI → integrations.

### Step 2: Close the Foundation Sprints (00–03)

**Outcome:** security baseline, auth shell, and tenant isolation are verified end-to-end.

- Sprint 00: Architecture gate evidence validated across all lanes.
- Sprint 01: CI/CD, environment validation, preview checklist confirmed in gating docs.
- Sprint 02: Auth shell UX + protected routes + session refresh verified against API.
- Sprint 03: Tenant isolation enforced in API data access and AI observability routes; negative tests verified.

**Deliverables:**
- Gate evidence bundles: architecture, CI/CD, auth shell, tenant isolation.
- End-to-end auth and membership flow validated.

### Step 3: Complete Core Workflow and Ingestion Sprints (04–05)

**Outcome:** core domain workflows and ingestion lifecycle are complete and testable from UI to API.

- Sprint 04: project lifecycle, document lifecycle, activity history, and AI tool wrappers for core workflows.
- Sprint 05: ingestion pipeline lifecycle (create, fail, retry) + discovery and query contracts wired end-to-end.

**Deliverables:**
- UI flows: project create/transition, document create/fail/retry, activity timeline.
- API and domain tests with tenant checks.
- AI runtime tool coverage for core workflows.

### Step 4: Complete AI Runtime and Safety Sprints (06–07)

**Outcome:** AI tools, retrieval quality, safety controls, and evidence are complete.

- Sprint 06: tool registry maturity and AI run state reliability.
- Sprint 07: retrieval/citation quality, moderation enforcement, safety metrics.

**Deliverables:**
- AI action gate packet with tool execution examples.
- AI quality gate packet including moderation evidence and retrieval/citation correctness.

### Step 5: Complete Integrations and Notification Sprints (08–09)

**Outcome:** integrations and automation run safely with full webhook lifecycle and user preferences.

- Sprint 08: connector lifecycle, automation eventing, idempotency, durability.
- Sprint 09: webhook delivery/replay, notification preference control, and access sync checks.

**Deliverables:**
- UI connector diagnostics and webhook replay UX.
- Integration and notification audit logs and tests.

### Step 6: Finish Analytics, Security Hardening, and GA (10–11)

**Outcome:** readiness for GA launch with stability, security, and observability coverage.

- Sprint 10: analytics integrity, entitlement/usage safeguards (non-monetized), security hardening.
- Sprint 11: reliability, GA readiness, rollback plans, and production release checklist.

**Deliverables:**
- Beta readiness gate packet.
- GA launch gate packet with rollout/rollback evidence.

## 3) Workstream Execution Guide

### Backend Workstream (Step-by-Step)

1. Normalize auth middleware and tenant guards across all routes.
2. Ensure workspace/membership/role checks exist for every domain route.
3. Complete missing endpoint flows for core domain and ingestion UI operations.
4. Expand API tests for negative tenant access and permission boundary behavior.
5. Validate AI runtime routes against strict contracts.
6. Produce gate evidence for sprints 04–11 in the backend lane.

### Frontend Workstream (Step-by-Step)

1. Complete auth shell UX with session refresh and error states.
2. Build workspace and project CRUD screens aligned to API contracts.
3. Implement ingestion lifecycle UI and activity timeline.
4. Finish AI action UI with high-risk confirmation and moderation responses.
5. Complete integration/automation diagnostics and webhook replay UI.
6. Build notification preference settings and entitlement guard components.
7. Provide UI evidence snapshots for each sprint gate packet.

### Data Platform Workstream (Step-by-Step)

1. Finish evidence bundles for Sprint 00-11.
2. Complete remaining data-lifecycle persistence for access/notification flows.
3. Validate RLS and migration guard coverage for tenant isolation.
4. Ensure retrieval/citation persistence aligns with AI runtime and backend interfaces.
5. Provide gate evidence for data access, retention, and integrity rules.

### AI Runtime Workstream (Step-by-Step)

1. Finish core workflow tool wrappers for all required domain operations.
2. Consolidate moderation policy enforcement across AI tool execution.
3. Expand retrieval/citation quality checks and evidence.
4. Produce full AI action and AI quality gate packets with metrics.
5. Verify observability endpoints with auth enforcement and alert thresholds.

### DevOps/SRE + Security/Compliance Workstream (Step-by-Step)

1. Finalize CI gate documentation and evidence per sprint.
2. Integrate runbooks and alerting into release gate packets.
3. Perform security/compliance review on AI safety and tenant isolation.
4. Provide explicit risk sign-off and mitigation notes for GA.

## 4) Quality Gates by Sprint (Definition)

- Sprint 00: architecture gate (static validation, contracts, dependency map).
- Sprint 01: CI/CD gate (pipeline + environment validation). 
- Sprint 02: auth shell gate (login, session refresh, protected routes). 
- Sprint 03: tenant isolation gate (RLS and authorization checks). 
- Sprint 04: core workflow gate (project/document lifecycle). 
- Sprint 05: discovery gate (ingestion/retrieval correctness). 
- Sprint 06: AI action gate (tool execution, policy checks). 
- Sprint 07: AI quality gate (moderation + retrieval/citation). 
- Sprint 08: automation gate (connector lifecycle + eventing). 
- Sprint 09: notification/access sync gate (preferences + replay). 
- Sprint 10: beta readiness gate (analytics + hardening). 
- Sprint 11: GA launch gate (rollback + release readiness). 

## 5) Release Readiness Checklist (Executive)

1. All gate packets delivered and signed-off.
2. Full regression suite passes per testing strategy.
3. Feature flags and non-monetized guards documented and enforced.
4. Observability dashboards in place and alert thresholds configured.
5. Rollback procedures tested and documented.
6. Final demo end-to-end run completed with known risks logged.

## 6) Executive KPI Targets (Demo MVP)

- Zero cross-tenant data leakage in tests.
- AI moderation policy denies are visible and safely handled.
- Ingestion-to-retrieval success rate above 95% in test fixtures.
- Automation events and webhook replay flows are deterministic and idempotent.
- CI gate green and release checklist completed for Sprint 11.
