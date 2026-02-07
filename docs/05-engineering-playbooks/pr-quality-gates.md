# PR Quality Gates Playbook

## Purpose

Ensure every merge is safe, testable, observable, and aligned to architecture constraints.

## Mandatory PR Checklist

- Story ID included in PR title/description.
- Acceptance criteria mapping included.
- Scope boundaries and out-of-scope noted.
- Tests added/updated and passing.
- Security/auth implications documented.
- Observability updates documented.
- Rollback notes provided for risky changes.

## Review Sequence

1. Self-review and checklist completion by author.
2. Functional review by feature owner.
3. Architecture/security review where required.
4. CI gate validation.
5. Merge only after all required approvals.

## Blocking Conditions

- Failing CI quality checks.
- Missing tests on critical path changes.
- Unauthorized architectural boundary violations.
- Unresolved security-critical comments.

## Evidence Required for High-Risk PRs

- Test output summaries.
- Performance impact note (if applicable).
- Migration plan and rollback note.
- Feature flag and rollout strategy.

