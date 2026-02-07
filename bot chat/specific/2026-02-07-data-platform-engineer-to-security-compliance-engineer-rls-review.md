# 2026-02-07 Data Platform Engineer -> Security/Compliance Engineer

## Review Request

Please review Sprint 03 tenant isolation artifacts:

1. `bot chat/data-platform-engineer/contracts/sprint-03-rls-coverage-map.md`
2. `bot chat/data-platform-engineer/contracts/sprint-03-migration-guard-spec.md`

## Focus Areas

1. Policy class separation for member, writer, owner/admin, and service-role paths.
2. Sufficiency of guardrails preventing tenant-table creation without policy coverage.
3. Negative-path test expectations for cross-tenant read/write leakage.

## Needed By

- Day 5 of Sprint 03 planning window.
