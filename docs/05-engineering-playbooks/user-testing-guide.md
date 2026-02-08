# User Testing Guide (End-to-End)

## Purpose
Provide a complete, repeatable checklist to validate every feature area before a demo, release candidate, or sprint gate. This guide converts the feature plan into testable user workflows, plus negative tests, observability checks, and gate evidence expectations.

## References
- Testing strategy: docs/05-engineering-playbooks/testing-strategy.md
- Observability: docs/05-engineering-playbooks/observability-playbook.md
- Feature plan index: docs/02-features/README.md

## 0) Test Strategy Snapshot
Follow the test pyramid:
1) Unit tests for deterministic logic and edge handling.
2) Integration tests at module/contract boundaries.
3) End-to-end tests for critical user workflows.
4) Regression suites for authz, billing, AI safety, and tenant isolation.

Mandatory coverage areas:
- Auth/session lifecycle.
- Authorization and tenant isolation.
- Domain workflow invariants.
- Webhook security and idempotency.
- AI tool authorization and schema conformance.
- Usage/billing state transitions.

## 1) Environment and Preconditions

### 1.1 Local services
- Start DB: docker compose up -d
- API dev server: npm run -w @ethoxford/api dev
- Web dev server: npm run -w @ethoxford/web dev

### 1.2 Validate environment + policies
- Validate env: npm run validate:env
- Validate AI runtime policy: npm run validate:ai-runtime

### 1.3 Baseline checks (smoke)
- API process starts without unhandled exceptions.
- Web app loads and reaches landing route.
- App connects to DB and performs a simple health/seed query (if applicable).

### 1.4 Test data
- Use deterministic fixtures for repeatable tests.
- Create at least two workspaces and two users with different roles (admin + member).
- Ensure a clear seed dataset for domain entities and ingestion assets.

## 2) Universal Test Checklist (Run for Every Feature)

### 2.1 Functional positive flow
- Primary user journey works end-to-end without manual DB fixes.
- UI reflects server state and handles loading/error/empty states.
- Actions persist and show expected side-effects.

### 2.2 Negative and boundary tests
- Unauthorized access returns proper error and no data leakage.
- Cross-tenant access is blocked.
- Invalid inputs return structured validation errors.
- Concurrency conflicts are handled gracefully.

### 2.3 Observability checks
- Each request includes request_id + correlation_id where applicable.
- Logs contain workspace_id and actor_id for tenant actions.
- Any background job emits start/finish/failure logs.

### 2.4 Regression safety
- Run unit/integration tests for touched areas.
- Re-run authz and tenant-isolation regressions.

## 3) Feature-Based User Testing Matrix

### Feature 01: Platform Foundation
Scope: CI/CD, module boundaries, env validation.
- Verify npm run lint, npm run typecheck, npm run test, npm run build.
- Validate architecture import boundaries and linting.
- Ensure env validation errors are actionable.

### Feature 02: Identity, Tenant Model, and Access Control

#### F2-E1 Authentication
- Sign-up, sign-in, logout, session refresh.
- Expired session behavior (graceful failure or refresh).
- OAuth callback handling (if configured).

Negative tests:
- Access protected routes while logged out.
- Attempt reuse of expired session token.

#### F2-E2 Workspaces and Memberships
- Create workspace, switch workspace, persist selection.
- Invite user, accept invite, role assignment constraints.
- Remove member; ensure ownership transfer protections.

Negative tests:
- Non-admin tries to invite or change roles.
- Workspace switch does not leak cross-tenant data.

#### F2-E3 Authorization and Isolation
- Role/permission mapping enforced across API and UI.
- RLS policies enforced on data reads/writes.
- Regression suite for positive/negative role access.

### Feature 03: Core Domain and User Workflows

#### F3-E1 Domain Model and Rules
- Create core entities with required fields.
- Validate disallowed state transitions and field constraints.
- Verify structured validation errors.

#### F3-E2 CRUD Journeys
- List views with pagination and filters.
- Detail views show related entities.
- Create/edit/archive flows and optimistic updates.
- Activity timeline records actor/timestamp/mutation summary.

#### F3-E3 Search, Filters, and Saved Views
- Search across key fields with filters/sort.
- URL state sync for query parameters.
- Create/update/delete saved views; set default view.

Negative tests:
- Invalid filters return clear errors.
- Search returns zero results without crashing.

### Feature 04: AI Assistant and Agent Runtime

#### F4-E1 Gateway and Prompt System
- All AI calls route through gateway and include metadata.
- Prompt version changes are traceable and reversible.
- Structured output schema validation and fallback behavior.

#### F4-E2 Tool Calling + Action Execution
- Tool registry enforces permissions.
- Multi-step agent loops persist state and recover on retry.
- Tool errors do not corrupt domain state.

#### F4-E3 Guardrails + Quality
- Evals can run against sample tasks.
- Unsafe prompts/actions are blocked with refusal messaging.
- Model version rollback works for regressions.

### Feature 05: Knowledge Ingestion and Retrieval

#### F5-E1 Ingestion Pipeline
- Upload document and verify metadata.
- Parsing + chunking preserves source traceability.
- Retry and dead-letter behavior for failures.

#### F5-E2 Embeddings and Retrieval
- Embedding generation stored with model version.
- Hybrid retrieval returns scored results with filters.
- Tenant isolation enforced in retrieval queries.

#### F5-E3 Citations and Explainability
- Citations render in AI responses with source excerpts.
- Evidence panel shows confidence signals.
- Feedback capture routes to quality triage.

### Feature 06: Integrations and Automation

#### F6-E1 Connector Framework
- Connector registry creates/updates connectors.
- Credentials stored securely and revocable.
- Connector health status visible.

#### F6-E2 Automation Runtime
- Canonical event publish + subscribe.
- Trigger/condition/action flows run deterministically.
- Run history shows status + diagnostics.
- Idempotency keys prevent duplicate effects.

#### F6-E3 Notifications and Webhooks
- Notification preferences apply correctly.
- Webhooks are signed and replayable.
- Delivery logs show attempts and responses.

### Feature 07: Demo Governance and Usage Safeguards

#### F7-E1 Demo Access Lifecycle
- Access state transitions are deterministic and logged.
- Lifecycle event replay does not corrupt state.

#### F7-E2 Usage Policy Enforcement
- Quotas and policy checks enforced in middleware.
- Recovery mode behavior works when triggered.
- Limit messaging is accurate and contextual.

#### F7-E3 Adoption Analytics
- Event taxonomy tracked with required properties.
- Dashboards display activation/adoption/retention metrics.

### Feature 08: Operations, Security, and Launch

#### F8-E1 Security Hardening
- Security headers enabled.
- CSRF/SSRF and input hardening tests pass.
- Dependency and secret scanning gates enforced.

#### F8-E2 Reliability and Performance
- Latency/throughput/error metrics visible.
- Load tests meet target SLO envelope.
- Incident runbooks are executable.

#### F8-E3 Release and Launch
- Pre-release gate checklist complete.
- Migration and rollback rehearsals pass.
- Staged rollout controls verified.

## 4) Gate Evidence Checklist (Per Sprint)
- Each acceptance criteria verified.
- Test evidence captured (screenshots/log excerpts).
- Observability fields present (request_id, correlation_id).
- Known risks logged with owners and target dates.

## 5) Optional Automation
- Run full pipeline: npm run ci
- Run unit + integration locally on changed packages.
- Add new regressions for any bug found.

## 6) Troubleshooting Tips
- Use correlation_id to trace across services.
- Verify tenant context in every request and log line.
- Re-run tests with a clean DB if data drift is suspected.

## 7) Release Readiness Signal
Declare release-ready when:
- All critical path tests pass.
- No flaky tests on release branch.
- Smoke + core regression suites pass.
- Observability dashboards show stable metrics.
