# Context Pack: Sprint 02 AI Runtime Auth Shell Controls

## Story Focus

- Enforce authenticated/member-bound AI runtime context and observability access.

## Inputs Used

1. `docs/07-role-sprint-plans/sprint-02-observability-auth-baseline/ai-runtime-engineer/section-contribution-plan.md`
2. `docs/00-governance/definition-of-ready-and-done.md`
3. `docs/03-backlog/dependency-map.md`
4. `docs/04-sprints/sprint-02-observability-auth-baseline.md`

## Key Contracts

1. Member-context resolution from request headers/session.
2. Deterministic denial envelope (`auth_denied`, `policy_denied`, `validation_denied`).
3. Workspace-scoped AI observability queries.

## Implementation Surfaces

1. `apps/api/src/app.ts`
2. `apps/api/src/server.ts`
3. `apps/api/src/app.test.ts`
4. `apps/api/src/server.test.ts`

## Quality and Safety Checks

1. Auth/membership negative tests present.
2. Tenant-scoped filtering validated for runtime lists and observability output.
3. Full pipeline validation passed (`npm run ci`).

## Downstream Handoff Targets

1. QA/Release for auth-shell gate packet assembly.
2. Security/Compliance for policy-denial and access-control verification.
