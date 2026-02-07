# Definition of Ready (DoR) and Definition of Done (DoD)

## Purpose

Standardize quality gates so every story enters implementation with clear inputs and exits with production-safe outputs.

## Story Definition of Ready (DoR)

A story is ready only when all of the following are true:

1. Problem statement is clear and user-impact oriented.
2. Business acceptance criteria are specific and testable.
3. Technical acceptance criteria are explicit.
4. Dependencies are identified and either complete or committed in prior sprint.
5. Required schema/API contracts are defined.
6. Security and authorization expectations are explicit.
7. Observability expectations are explicit (logs, metrics, traces, alerts).
8. Test strategy is included (unit/integration/e2e expectations).
9. Rollback approach is identified for risky changes.
10. Owner and reviewers are assigned.

## Story Definition of Done (DoD)

A story is done only when all of the following are true:

1. Functional behavior matches all acceptance criteria.
2. Contract compatibility is preserved (or versioned if changed).
3. Authorization and tenant-scoping behavior are validated.
4. Tests pass at required levels.
5. Required logs/metrics/traces are emitted and observable.
6. Documentation is updated in `/docs` where relevant.
7. Security checks pass (no critical blockers introduced).
8. Feature flags (if applicable) are configured and documented.
9. Rollback path is tested or verified.
10. PR approved and merged through CI gates.

## Epic Definition of Ready

An epic is ready only when:

- success outcomes are measurable,
- story decomposition is complete enough for two sprints,
- integration impact is mapped,
- non-functional requirements are specified,
- rollout strategy is identified.

## Epic Definition of Done

An epic is done only when:

- all child stories meet DoD,
- cross-team integration tests pass,
- production telemetry confirms expected behavior,
- known defects are triaged with accepted risk,
- post-implementation review is documented.

