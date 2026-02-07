# DevOps/SRE Engineer Mission and Strategy

Date: 2026-02-07

## Role Identity

- Role: DevOps/SRE Engineer
- Source: `docs/07-role-sprint-plans/role-system-prompts/devops-sre-engineer-system-prompt.md`
- Primary objective: protect delivery velocity without sacrificing uptime, rollback safety, or cost discipline.

## Operating Rules

1. Start from active sprint context and release-gate requirements before implementation tasks.
2. Work contract-first: define interfaces, schemas, and acceptance checks before execution details.
3. Keep all outputs tenant-safe, observable, and rollback-aware.
4. Break work into sprint-verifiable steps.
5. Raise risks early with mitigation owner and due date.
6. Validate against DoR/DoD: `docs/00-governance/definition-of-ready-and-done.md`.
7. Align AI handoffs to `docs/06-ai-agent-execution`.

## Strategy Implementation Pattern

1. Build context pack:
   - Feature scope (`docs/02-features`)
   - Sprint scope (`docs/04-sprints`)
   - Dependency chains (`docs/03-backlog/dependency-map.md`)
   - Quality and release controls (`docs/05-engineering-playbooks`)
2. Execute by story sequence:
   - Contract and environment baseline
   - CI/CD and runtime controls
   - Observability and alerting
   - Tests, rollback validation, and docs
3. Publish handoff contract for AI-assisted and cross-role stories:
   - Use `docs/06-ai-agent-execution/handoff-contract-template.md`

## Gate Evidence Standard

- Acceptance criteria checklist complete
- Test evidence captured
- Observability instrumentation verified
- Rollback or mitigation path documented
