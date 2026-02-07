# Risk and Dependency Register

## Usage

Use this register in sprint planning and weekly risk review.  
Each risk must have owner, mitigation, and target review date.

## Risk Register

| ID | Risk | Likelihood | Impact | Early Signal | Mitigation | Owner |
|---|---|---|---|---|---|---|
| R-01 | Domain requirement ambiguity | High | High | Story churn >20% | Scope lock and change control in Sprint 0 | Product Lead |
| R-02 | AI action reliability variance | Medium | High | Tool call retries spike | Strict schemas and action guardrails | AI Lead |
| R-03 | Tenant isolation regression | Low/Med | Critical | Failed authz tests | RLS policy tests and mandatory review checklist | Security Lead |
| R-04 | Connector API instability | Medium | High | Increased webhook failures | Retry/idempotency/replay tooling | Integration Lead |
| R-05 | Cost overrun from model usage | Medium | Medium/High | Daily cost spike over budget | Usage budgets, caching, tiered model routing | Platform Lead |
| R-06 | Performance degradation at scale | Medium | High | P95 latency breach | Load testing and index optimization | Platform Lead |
| R-07 | Release quality regression | Medium | High | Escaped defects rising | Release gates and canary rollout | QA/Release Lead |
| R-08 | Team throughput bottlenecks | Medium | Medium | PR queue and blocked stories | WIP limits and dependency-first planning | Engineering Manager |
| R-09 | Prompt contract drift across teams | Medium | High | Parsing failures or incompatible payloads | Contract-first schema registry with version pinning | AI Runtime Lead |
| R-10 | Unsafe AI tool invocation | Low/Med | Critical | Unauthorized action attempt appears in logs | Strict allowlist policy and mandatory confirmation for high-risk actions | Security Lead |
| R-11 | AI rollout regression escapes to production | Medium | High | Eval score drop with rising support incidents | Canary model rollout with automatic rollback triggers | QA/Release Lead |
| R-12 | Missing AI gate evidence at sprint close | Medium | High | Unverified acceptance checklist by day 9 | Evidence checklist owner assignment at sprint start | AI Runtime Lead |
| R-13 | Cross-role contract drift after freeze window | Medium | High | Day 6 drift review shows schema/env mismatch | Enforce day-3 lock and freeze-window change control | Platform Lead |
| R-14 | AI telemetry schema inconsistency across services | Medium | High | Missing or mismatched correlation and run fields in traces | Publish shared telemetry contract and add CI/QA evidence checks | DevOps/SRE Lead |
| R-15 | Late gate evidence handoff to QA/Release | Medium | High | Day 9 packet incomplete or missing references | Require day-6 precheck and evidence owner assignment per lane | QA/Release Lead |

## Dependency Register

| ID | Dependency | Type | Needed By | Risk | Fallback |
|---|---|---|---|---|---|
| D-01 | Auth provider setup | External | Sprint 2 | Medium | temporary local auth sandbox |
| D-02 | Demo usage policy and limit config | Internal | Sprint 9 | Medium | default conservative usage caps and manual override runbook |
| D-03 | AI provider keys and quotas | External | Sprint 6 | High | mock gateway and deferred enablement |
| D-04 | Notification provider domain setup | External | Sprint 9 | Low/Med | queue and retry until DNS validated |
| D-05 | Stakeholder acceptance criteria freeze | Internal | Sprint 0 | High | change control board |
| D-06 | Security review bandwidth | Internal | Sprint 10 | Medium | pre-book review windows |
| D-07 | Stable tool action API contracts from backend | Internal | Sprint 4-6 | High | temporary adapter layer with strict schema validator |
| D-08 | Retrieval payload and citation schema from data platform | Internal | Sprint 5-7 | High | isolate AI response path behind feature flag until schema finalized |
| D-09 | AI run telemetry fields in observability stack | Internal | Sprint 2-6 | Medium | emit local structured logs and backfill traces once pipeline is ready |
| D-10 | Release gate evidence format from QA/Release | Internal | Sprint 7-11 | Medium | generate interim evidence pack from AI runtime template |
| D-11 | Security gate checklist publication for sprint freeze | Internal | Sprint 0 onward | Medium | escalate to Security Lead by day 4 and apply temporary hardening checklist |
| D-12 | QA/release gate evidence template alignment | Internal | Sprint 0 onward | Medium | use default release playbook format until QA template arrives |

## Escalation Rules

- Critical risk without mitigation owner escalates same day.
- Any dependency delay affecting sprint objective escalates within 24 hours.
- Security-critical blockers freeze merge for affected scope.
