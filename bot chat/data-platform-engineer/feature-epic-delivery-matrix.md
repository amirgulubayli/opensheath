# Data Platform Feature and Epic Delivery Matrix

Date: 2026-02-07
Owner: Data Platform Engineer
Purpose: implementation-level data deliverables across every feature, sprint, and epic.

## Legend

- Ownership: `Lead` (data lane owns outcome), `Partner` (shared delivery).
- Status: `Queued`, `In Progress`, `Done`, `Blocked`.

## Feature 01 - Platform Foundation

| Epic | Sprint | Data Ownership | Data Deliverables | Dependencies | Status |
|---|---|---|---|---|---|
| F1-E1 | 01 | Lead | Shared event envelope contract, schema naming/versioning conventions, migration discipline baseline. | Backend contract consumers, DevOps CI checks. | In Progress |
| F1-E2 | 01 | Partner | Migration dry-run in CI, seed/data validation hooks, env validation for data services. | DevOps pipeline ownership. | Queued |
| F1-E3 | 02 | Partner | Structured log schema fields for data jobs, trace correlation fields on data mutations. | Backend observability consumers, DevOps dashboards. | Queued |

## Feature 02 - Identity, Tenant, Access

| Epic | Sprint | Data Ownership | Data Deliverables | Dependencies | Status |
|---|---|---|---|---|---|
| F2-E1 | 02 | Partner | Identity and session-adjacent persistence contracts with tenant-safe keys and auditability. | Backend auth flow contracts, Security controls. | Queued |
| F2-E2 | 03 | Lead | Workspace and membership schema integrity, ownership constraints, lifecycle mutation traces. | Backend membership services, Frontend workspace flows. | Queued |
| F2-E3 | 03 | Lead | RLS policy suite coverage, permission mapping persistence support, authz negative fixtures. | Security sign-off, QA regression gate. | Queued |

## Feature 03 - Core Domain Workflows

| Epic | Sprint | Data Ownership | Data Deliverables | Dependencies | Status |
|---|---|---|---|---|---|
| F3-E1 | 04 | Lead | Core domain tables, lifecycle/state fields, migration safety and rollback strategy. | Backend domain invariants. | Queued |
| F3-E2 | 04 | Partner | Activity timeline persistence, mutation event logging, concurrent update-safe storage semantics. | Backend API flows, Frontend mutation UX. | Queued |
| F3-E3 | 05 | Lead | Query/index plan for filter/sort/pagination latency targets, saved-view support schema. | Frontend query UX, QA performance tests. | Queued |

## Feature 04 - AI Assistant Runtime

| Epic | Sprint | Data Ownership | Data Deliverables | Dependencies | Status |
|---|---|---|---|---|---|
| F4-E1 | 06 | Partner | Structured output schema metadata persistence, prompt/model version trace fields. | AI runtime schema contracts. | Queued |
| F4-E2 | 06 | Lead | `agent_runs` and `tool_calls` persistence, run-step state model, retry/failure telemetry fields. | AI runtime tool policy contract, Backend action handlers. | Queued |
| F4-E3 | 07 | Partner | Evals and safety telemetry storage, model rollback attribution data for incident review. | AI runtime eval harness, Security policy controls. | Queued |

## Feature 05 - Knowledge Ingestion and Retrieval

| Epic | Sprint | Data Ownership | Data Deliverables | Dependencies | Status |
|---|---|---|---|---|---|
| F5-E1 | 05 | Lead | Document intake metadata schema, chunk traceability pointers, pipeline retry/dead-letter persistence. | Backend ingestion services, DevOps job infrastructure. | Queued |
| F5-E2 | 07 | Lead | Embedding version model, vector index strategy, hybrid retrieval scoring and tenant isolation guards. | AI runtime retrieval consumers, QA leakage tests. | In Progress |
| F5-E3 | 07 | Partner | Citation provenance storage, evidence quality metadata, feedback loop persistence. | Frontend evidence panel contracts, AI runtime quality loops. | In Progress |

## Feature 06 - Integrations and Automation

| Epic | Sprint | Data Ownership | Data Deliverables | Dependencies | Status |
|---|---|---|---|---|---|
| F6-E1 | 08 | Lead | Connector credentials metadata model and secure lifecycle state persistence. | Security secret handling standards, Backend connector adapters. | In Progress |
| F6-E2 | 08 | Lead | Canonical event envelope persistence, automation run history tables, retry/idempotency/dead-letter state models. | Backend automation engine, DevOps queue ops. | In Progress |
| F6-E3 | 09 | Lead | Delivery log persistence, replay control records, outbound webhook attempt metadata and diagnostics. | Backend webhook service, QA replay tests. | In Progress |

## Feature 07 - Billing, Entitlements, Growth

| Epic | Sprint | Data Ownership | Data Deliverables | Dependencies | Status |
|---|---|---|---|---|---|
| F7-E1 | 09 | Lead | Demo access lifecycle state persistence, event dedupe, and reconciliation contracts. | Backend access-state orchestration, Security webhook verification. | In Progress |
| F7-E2 | 10 | Lead | Usage policy persistence support, usage counter correctness controls, quota reset consistency model. | Backend runtime enforcement, Frontend boundary UX. | In Progress |
| F7-E3 | 10 | Partner | Adoption analytics taxonomy storage validation, event integrity checks, queryability guarantees. | Product/Frontend dashboard consumers, QA validation. | In Progress |

## Feature 08 - Ops, Security, Launch

| Epic | Sprint | Data Ownership | Data Deliverables | Dependencies | Status |
|---|---|---|---|---|---|
| F8-E1 | 10 | Partner | Data-layer security hardening evidence, schema policy checks, sensitive path audit integrity. | Security lead controls, DevOps scanning and alerts. | Queued |
| F8-E2 | 11 | Lead | SLO data instrumentation validation for DB/jobs/retrieval, load-test data-path bottleneck mitigation. | DevOps monitoring, QA reliability tests. | Queued |
| F8-E3 | 11 | Lead | Migration and rollback rehearsal artifacts, GA data-readiness evidence packet, recovery timing proof. | DevOps release control, QA/Release go-no-go. | Queued |

## Current Implementation Focus

1. Sprint 08 connector metadata and automation durability implementation and verification.
2. Sprint 07/08/10 evidence packet consolidation with command-level proof links.
3. Cross-role implementation handoffs for backend/frontend/devops/security/qa consumers.
