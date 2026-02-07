# Sprint 01 CI Data Validation Contract

Date: 2026-02-07
Owner: Data Platform Engineer
Gate: CI/CD gate

## Purpose

Define data-specific checks that must run in CI before contract or migration changes can merge.

## Required CI Checks

1. Migration ordering and replay check:
   - Ensure migrations apply in sequence on clean database.
2. Rollback viability check:
   - Verify rollback notes exist for each migration in PR scope.
3. Contract compatibility check:
   - Fail on unversioned breaking changes to shared schema/event contracts.
4. Tenant safety check:
   - Fail if new tenant table lacks `workspace_id` and policy coverage plan.
5. Index declaration check:
   - Ensure new query-facing fields include index strategy note when required.

## PR Evidence Requirements

1. Contract delta summary (added/changed/deprecated fields).
2. Integration impact list (backend/frontend/ai-runtime/devops/qa).
3. Observability note for new data path.
4. Rollback note for risky changes.

## Failure Policy

1. Any failed data check blocks merge.
2. Emergency bypass requires explicit owner plus rollback and incident note.

## CI/CD Gate Evidence Checklist

1. Migration and compatibility checks passing.
2. No unscoped tenant tables introduced.
3. Data contract changes versioned and documented.
4. Handoff contract published for downstream consumers.
