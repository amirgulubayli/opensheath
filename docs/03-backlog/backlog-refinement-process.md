# Backlog Refinement Process

## Objective

Maintain an implementation-ready backlog with low ambiguity and high delivery predictability.

## Refinement Workflow

1. Product and architecture leads pre-triage new items.
2. Convert requests into feature/epic/story structure.
3. Attach acceptance criteria and dependency links.
4. Validate DoR using `docs/00-governance/definition-of-ready-and-done.md`.
5. Assign sprint targets and owners.

## Entry Criteria for Sprint Planning

- Story has clear acceptance criteria.
- Dependency chain validated in `docs/03-backlog/dependency-map.md`.
- Security/auth impacts explicitly documented.
- Testing expectations documented.

## Exit Criteria from Refinement

- Story is estimated.
- Priority assigned.
- Sprint target assigned.
- Owner and reviewers identified.

## Estimation Framework

Use complexity points (not hours):

- `1`: trivial isolated change.
- `2`: low complexity with predictable edge cases.
- `3`: moderate complexity, cross-module integration.
- `5`: high complexity, multiple dependencies.
- `8`: very high complexity; consider splitting.

## Splitting Rule

Any story estimated above `5` must be split before sprint commitment unless explicitly approved as a spike.

## Refinement Cadence

- Primary refinement: once weekly.
- Pre-planning final pass: day before sprint planning.

