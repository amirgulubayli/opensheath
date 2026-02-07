# Epic 01: Foundation and Auth Completion (Sprints 00-03)

## Goal

Close remaining gaps in architecture validation, CI/CD gate proof, auth shell UX, and tenant isolation enforcement.

## Scope

- Architecture gate evidence for Sprint 00.
- CI/CD gate evidence for Sprint 01.
- Auth shell UX and session refresh coverage for Sprint 02.
- Tenant isolation validation for Sprint 03.

## Dependencies

- Sprint roadmap: [docs/04-sprints/sprint-roadmap.md](../../04-sprints/sprint-roadmap.md)
- DoR/DoD: [docs/00-governance/definition-of-ready-and-done.md](../../00-governance/definition-of-ready-and-done.md)

## Deliverables

- Gate evidence packets for sprints 00-03.
- End-to-end auth and membership flow verified (UI → API → domain).

## Step-by-Step Plan

1. Validate CI pipeline evidence across lint, env validation, typecheck, tests, and build.
2. Confirm auth routes and session refresh behavior with negative tests.
3. Complete frontend auth UX: login, OAuth exchange, refresh, error states.
4. Implement tenant guard normalization for all API routes.
5. Run and capture tenant isolation tests (positive + negative across routes).

## Evidence Required

- CI artifacts and logs.
- Auth shell UX screenshots or test output.
- Tenant isolation tests and denial-path evidence.

## Risks

- Tenant guard inconsistencies across route families.
- Auth session edge cases not covered by UI.

## Exit Criteria

- Auth shell and tenant isolation gates are marked complete.
- Tests pass with no tenant leakage in negative test cases.
