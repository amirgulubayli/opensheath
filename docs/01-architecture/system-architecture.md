# System Architecture

## Objective

Define a modular architecture that scales delivery while preserving tenant isolation, reliability, and AI action safety.

## Architecture Style

- Modular monolith for early speed with strict internal boundaries.
- Event-driven patterns for asynchronous workflows and integrations.
- Contract-first interfaces between UI, domain services, and integration adapters.

## Primary Components

1. **Web App Layer**
   - Next.js app routes, server actions, and authenticated UI shell.
   - Responsibilities: user interactions, request orchestration, presentation logic.
2. **Domain Service Layer**
   - Business use-cases and invariants.
   - Responsibilities: validation, state transitions, policy-aware orchestration.
3. **Data Access Layer**
   - Repository interfaces + query services.
   - Responsibilities: persistence, indexing usage, transaction boundaries.
4. **AI Gateway**
   - Model routing, prompt templates, tool invocation loop.
   - Responsibilities: structured outputs, safety policies, run traces.
5. **Ingestion Pipeline**
   - Document parse/chunk/embed/index flow.
   - Responsibilities: pipeline reliability, status tracking, retries.
6. **Integration Hub**
   - Connector adapters (billing, notifications, external systems).
   - Responsibilities: webhook handling, retries, signature validation.
7. **Automation Engine**
   - Trigger/action runtime for internal and external events.
   - Responsibilities: rule evaluation, action dispatch, idempotency.
8. **Observability Plane**
   - Logging, tracing, metrics, and alerting.
   - Responsibilities: operability, root-cause acceleration, compliance evidence.

## Boundary Rules

- UI cannot access database directly.
- Domain services are the only place for business invariants.
- All cross-module calls pass typed contracts.
- Integrations cannot bypass authorization checks.
- AI tool actions must call the same domain use-cases as UI APIs.

## Deployment Topology

- Web app deployed to Vercel.
- Database and storage hosted in managed Postgres/Supabase.
- Background jobs run on managed workers/cron runtime.
- Staging mirrors production integrations with safe test accounts.

## Evolution Path

- Stage 1: modular monolith with job workers.
- Stage 2: extract high-throughput components (ingestion, automation) if needed.
- Stage 3: isolate AI gateway or connectors into dedicated services when scaling demands.

