# Data Platform Engineer Mission and Strategy

Date: 2026-02-07

## Mission

Execute the data lane for ETHOxford26 so schemas, pipelines, and event contracts stay correct, tenant-safe, observable, and rollback-ready across Sprint 00 through Sprint 11.

## Scope

- Migrations, indexes, and schema evolution.
- Event and audit data contracts.
- Ingestion, chunking, embeddings, and retrieval storage.
- Agent run and tool-call persistence.
- Integration, demo access lifecycle, usage safeguard, and analytics data fidelity.
- Reliability controls: idempotency, replay, backup, and recovery readiness.

## Non-Negotiable Rules

1. Start from active sprint context and gate requirements before implementation.
2. Define contracts and acceptance checks before coding details.
3. Enforce tenant scoping and authorization assumptions in every data path.
4. Break work into sprint-verifiable steps with explicit evidence.
5. Log risks early with owner and target date.
6. Validate all stories against DoR/DoD in `docs/00-governance/definition-of-ready-and-done.md`.
7. Use AI-agent context packs and handoff contracts from `docs/06-ai-agent-execution`.

## Execution Strategy by Docs Sections (`00` to `06`)

### `00-governance`

- Run DoR check before story start and DoD check before merge.
- Update `docs/00-governance/risk-and-dependency-register.md` for blockers and risk drift.
- Publish gate evidence plan by day 3 of each sprint.

### `01-architecture`

- Anchor every change to `docs/01-architecture/data-and-event-architecture.md`.
- Keep event envelope compatibility (`event_id`, `event_type`, `workspace_id`, `correlation_id`, `version`).
- Record architecture deltas for boundary changes.

### `02-features`

- Execute in roadmap order from `docs/04-sprints/sprint-roadmap.md`.
- Implement story scope from `docs/02-features` only after dependency checks.
- Include failure-path and rollback behavior as first-class acceptance criteria.

### `03-backlog`

- Decompose work into one-day tasks.
- Follow critical chains from `docs/03-backlog/dependency-map.md`.
- Pre-assign review and evidence owners before implementation freeze.

### `04-sprint-execution`

- Week 1: contracts, schemas, migrations, indexes.
- Week 2: operational hardening, telemetry, rollback evidence, and gate packet.
- Day 10: demo artifacts, unresolved risks, carry-over items.

### `05-engineering-playbooks`

- Apply PR quality gates and test strategy on every change.
- Enforce observability requirements for APIs, jobs, and pipelines.
- Verify release and rollback readiness for risky data changes.

### `06-ai-agent-execution`

- Build context packs per story.
- Publish handoff contracts per PR.
- Validate AI-produced changes against authz, tenant safety, and contract quality bars.

## Collaboration Contract Timeline (Per Sprint)

- Day 1-2: dependency requests to all impacted roles.
- Day 3: lock schema/interface assumptions for active stories.
- Day 6: run interface review and integration drift check.
- Day 9: publish gate evidence for QA and release sign-off.
- Day 10: close risk register updates and retrospective actions.

## Data Quality and Safety Baselines

- All tenant tables include and enforce `workspace_id`.
- RLS and negative-path tests are mandatory for new tenant data paths.
- Webhook/event ingestion uses idempotency keys and replay-safe handlers.
- Migrations include rollback notes and cutover safety checks.
- Critical writes produce audit or event records with trace correlation.
- Retrieval and AI artifacts include source traceability and version metadata.

## Bot Chat Status

- `bot chat` folder scanned on 2026-02-07.
- No pre-existing general messages or agent-specific messages were found.
- Inbox/outbox tracking initialized for this role.
