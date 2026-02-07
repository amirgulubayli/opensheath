# 2026-02-07 Backend Mission and Sprint Strategy (S00-S11)

## Mission
Deliver contract-first backend services with strict tenant safety, deterministic business logic, and auditable release readiness.

## Non-Negotiables
- Enforce DoR and DoD from `docs/00-governance/definition-of-ready-and-done.md`.
- Keep service-layer authz plus DB-layer RLS for tenant resources.
- Preserve contract compatibility or version contracts explicitly.
- Add logs, metrics, traces, and rollback notes on every risky change.
- Complete dependency declarations by sprint day 3 and gate evidence by day 9.

## Section Strategy (00-06)
### 00-governance
- Validate story DoR before implementation.
- Track risks/dependencies in `docs/00-governance/risk-and-dependency-register.md`.
- Confirm release-gate evidence scope by day 3.

### 01-architecture
- Lock API/schema/event contracts first.
- Keep business invariants in domain services only.
- Record architecture deltas when boundaries change.

### 02-features
- Execute backlog in dependency order from `docs/03-backlog/dependency-map.md`.
- Prioritize P0/P1 stories on critical path.
- Validate negative paths early (authz, idempotency, failure behavior).

### 03-backlog
- Slice tasks to one-day chunks.
- Attach explicit reviewers and test evidence requirements.
- Publish cross-role dependencies before coding freeze.

### 04-sprint-execution
- Week 1: contracts, schemas, core service logic.
- Week 2: integration hardening, observability, negative-path tests, gate evidence.
- Day 10: demo artifacts, open risks, carry-over decisions.

### 05-engineering-playbooks
- Apply PR quality gates and testing strategy playbooks.
- Require rollback notes for migrations/integration changes.
- Ensure traces/logs/alerts exist for critical flows.

### 06-ai-agent-execution
- Build story context packs.
- Publish handoff contracts per AI-assisted story.
- Validate AI-generated outputs against backend quality bars.

## Sprint-by-Sprint Backend Execution Map

| Sprint | Gate | Backend Story Focus | Week 1 Focus | Week 2 Focus | Cross-Role Dependencies | Required Evidence |
|---|---|---|---|---|---|---|
| 00 | Architecture gate | Planning + ADR + risk baseline | Contract boundaries, API ownership, risk seeds | Finalize governance and dependency owners | Architecture, Security, DevOps | Approved architecture docs + risk register updates |
| 01 | CI/CD gate | F1-E1-S2, F1-E1-S3, F1-E2-S2 | Shared DTO/event envelope contracts | Boundary guardrails, env validation | Frontend, Data, DevOps | CI checks for contract consumers + boundary violations |
| 02 | Auth shell gate | F2-E1-S1/S2/S3 (+ observability support) | Session/auth middleware + protected route enforcement | OAuth callbacks, auth edge cases | Frontend, DevOps, Security, QA | Auth flow tests + unauthorized access negatives |
| 03 | Tenant isolation gate | F2-E2-S1/S2/S3, F2-E3-S1/S2/S3 | Workspace/membership services + role matrix | RLS completion + authz regression suite | Data, Security, QA, Frontend | Cross-tenant negative tests + policy coverage proof |
| 04 | Core workflow gate | F3-E1-S1/S2/S3, F3-E2-S2/S3 | Domain schema, migration safety, state transitions | Create/edit/archive and activity events | Data, Frontend, QA | Domain invariant tests + migration rollback notes |
| 05 | Discoverability gate | F3-E3-S1/S3, F5-E1-S1/S2/S3 | Query API + ingestion orchestration contracts | Retry/dead-letter + status/diagnostics | Data, AI Runtime, Frontend, DevOps | Query perf checks + ingestion recovery tests |
| 06 | AI action gate | F4-E1-S1/S2/S3, F4-E2-S1/S2/S3 | AI gateway contracts + tool policy mapping | Execution loop persistence + fallback controls | AI Runtime, Data, Security, QA | Tool authz negatives + schema conformance + audit logs |
| 07 | AI quality gate | F5-E2-S2/S3, F4-E3-S2/S3 (+ F5-E3-S1 support) | Tenant-scoped retrieval + moderation checkpoints | Canary/rollback controls + quality hardening | AI Runtime, Data, Security, QA | Cross-tenant retrieval negatives + safety policy evidence |
| 08 | Automation gate | F6-E1-S1/S2/S3, F6-E2-S1/S2/S3 | Connector registry + credential lifecycle | Event bus, trigger engine, idempotent retries | DevOps, Data, Security, QA | Idempotency proof + replay/dead-letter validation |
| 09 | Billing sync gate | F6-E3-S2/S3, F7-E1-S1/S2/S3 | Checkout + webhook verification/reconciliation | Billing state hardening + delivery replay controls | Frontend, Data, Security, QA | Signature validation tests + billing state regression suite |
| 10 | Beta readiness gate | F7-E2-S1/S2, F7-E3-S1, F8-E1-S3 | Entitlement policy model + runtime enforcement | Hardening checks + quota/grace edge handling | Data, Security, QA, Frontend | Entitlement boundary tests + runtime hardening sign-off |
| 11 | GA launch gate | F8-E2-S1/S2/S3, F8-E3-S1/S2/S3 | SLO tuning + migration/rollback rehearsal | Cutover support + stabilization triage | DevOps, Data, Security, QA | Load evidence + rollback rehearsal + release checklist |

## Top Risks for Backend Lane
| Risk | Mitigation | Owner | Due |
|---|---|---|---|
| Tenant isolation regression (R-03) | Enforce service authz + RLS + negative tests in CI | Backend + Security | Day 7 each sprint with tenant scope changes |
| Connector/API instability (R-04) | Idempotency keys, retries, dead-letter, replay tooling | Backend + DevOps | Sprint 08 Day 8 and Sprint 09 Day 8 |
| Billing config dependency (D-02) | Feature-flag billing surfaces until provider config is verified | Backend + Product | Sprint 09 Day 3 |
| AI key/quota dependency (D-03) | Mock gateway fallback and deferred production enablement | Backend + AI Runtime | Sprint 06 Day 3 |

## Handoff Checklist
- Contracts updated and linked.
- Downstream consumers identified.
- Tests and observability evidence attached.
- Rollback notes attached for risky changes.
- Next role action and owner/date stated clearly.
