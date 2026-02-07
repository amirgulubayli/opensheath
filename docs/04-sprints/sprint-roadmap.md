# Sprint Roadmap (Sprints 00-11)

## Objective

Provide the master execution map from inception through GA launch with explicit sprint outcomes and gates.

Scope override reference: `docs/00-governance/demo-mvp-scope-overrides.md`.

## Sprint Summary Table

| Sprint | Theme | Primary Epics | Gate |
|---|---|---|---|
| 00 | Inception and architecture lock | Planning + ADR + risk baseline | Architecture gate |
| 01 | Foundation system build | F1-E1, F1-E2 | CI/CD gate |
| 02 | Observability and auth baseline | F1-E3, F2-E1 | Auth shell gate |
| 03 | Tenant and authorization model | F2-E2, F2-E3 | Tenant isolation gate |
| 04 | Core domain workflows v1 | F3-E1, F3-E2 | Core workflow gate |
| 05 | Search and ingestion v1 | F3-E3, F5-E1 | Discoverability gate |
| 06 | AI runtime and tools v1 | F4-E1, F4-E2 | AI action gate |
| 07 | Retrieval quality and AI safety | F5-E2, F5-E3, F4-E3 | AI quality gate |
| 08 | Integrations and automation engine | F6-E1, F6-E2 | Automation gate |
| 09 | Notifications and demo access lifecycle | F6-E3, F7-E1 | Notification/access sync gate |
| 10 | Usage safeguards, analytics, security hardening | F7-E2, F7-E3, F8-E1 | Beta readiness gate |
| 11 | Reliability, release, GA rollout | F8-E2, F8-E3 | GA launch gate |

## Workstream Lanes

- Platform: CI/CD, infra, observability.
- Backend: domain services, APIs, integrations.
- Frontend: UX flows and interaction surfaces.
- AI: gateway, tools, eval quality.
- QA/SRE/Sec: quality gates, security, release controls.

## Planning Rules

- Do not start stories that violate dependency map.
- Reserve 15-20% sprint capacity for integration and defect handling.
- Freeze scope after day 3 unless critical.

## Story Source

Use `docs/03-backlog/master-story-catalog.md` as the canonical story set for sprint planning.
