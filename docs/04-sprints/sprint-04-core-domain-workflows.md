# Sprint 04: Core Domain Workflows v1

## Sprint Goal

Deliver the first complete deterministic product journey without AI dependency.

## Epic Scope

- `F3-E1` Domain schema and rules.
- `F3-E2` CRUD workflows.

## In-Sprint Stories

- `F3-E1-S1`, `F3-E1-S2`, `F3-E1-S3`
- `F3-E2-S1`, `F3-E2-S2`, `F3-E2-S3`

## Engineering Execution Plan

### Backend Lane

- Finalize domain entities and relationships.
- Implement validation/state-transition rules.
- Build create/update/archive use-cases.

### Frontend Lane

- Implement list/detail experiences.
- Implement create/edit/archive forms with validation messaging.
- Add activity timeline components.

### Platform/DB Lane

- Apply migrations and index baseline.
- Build deterministic seed fixtures for test/staging.
- Add data-access performance checks for key queries.

### QA Lane

- E2E scenarios for create/edit/archive and timeline visibility.
- Regression checks across roles and workspaces.

## Week-by-Week Plan

### Week 1

- Schema + migration implementation.
- Core service/use-case logic.
- Basic list/detail UI wiring.

### Week 2

- Form workflows and archive lifecycle.
- Activity timeline implementation.
- Integration stabilization and gate validation.

## Exit Criteria

- Main product journey is usable and stable.
- Domain invariants enforced consistently.
- Migration and rollback confidence established.

