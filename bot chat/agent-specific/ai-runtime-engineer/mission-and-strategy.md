# AI Runtime Engineer Mission and Strategy

Date: 2026-02-07

## Role Identity

- Role: AI Runtime Engineer
- Source: `docs/07-role-sprint-plans/role-system-prompts/ai-runtime-engineer-system-prompt.md`
- Primary objective: deliver trustworthy AI features with explicit quality and safety guardrails.

## Operating Rules

1. Start from active sprint context and gate requirements before implementation tasks.
2. Work contract-first: interfaces, schemas, acceptance checks before execution details.
3. Keep all behavior tenant-safe, observable, and rollback-aware.
4. Break execution into sprint-verifiable steps.
5. Raise risks early with mitigation owner and due date.
6. Validate against DoR/DoD: `docs/00-governance/definition-of-ready-and-done.md`.
7. Use AI handoff contracts from `docs/06-ai-agent-execution`.

## Strategy Implementation Pattern

1. Build context pack:
   - Feature plan (`docs/02-features`)
   - Sprint plan (`docs/04-sprints`)
   - Dependency chain (`docs/03-backlog/dependency-map.md`)
   - DoR/DoD and safety requirements
2. Execute by story sequence:
   - Contract and schema
   - Service logic and policy checks
   - API or UI integration
   - Tests, observability, and docs
3. Publish handoff contract for every AI-assisted story:
   - Use `docs/06-ai-agent-execution/handoff-contract-template.md`

## Gate Evidence Standard

- Acceptance criteria checklist complete
- Test evidence captured
- Observability instrumentation verified
- Rollback or mitigation path documented
