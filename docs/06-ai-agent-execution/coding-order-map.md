# Coding Order Map

## Purpose

Define deterministic implementation order so AI agents and engineers avoid incoherent partial builds.

## Order Layers

1. Foundation and CI (`F1`)
2. Identity and authorization (`F2`)
3. Core domain workflows (`F3`)
4. Ingestion pipeline (`F5-E1`)
5. AI runtime and tooling (`F4-E1`, `F4-E2`)
6. Retrieval and AI quality (`F5-E2`, `F5-E3`, `F4-E3`)
7. Integrations and automation (`F6`)
8. Demo governance, usage safeguards, and adoption analytics (`F7`)
9. Security hardening and launch (`F8`)

## Do-Not-Violate Dependency Rules

- Do not implement AI actions before role/policy model is stable.
- Do not implement usage safeguard enforcement before lifecycle sync pipeline exists.
- Do not implement launch controls before SLO instrumentation and load validation.

## Parallel Work Recommendations

- Parallelize UI against stable contracts.
- Parallelize observability instrumentation across workstreams.
- Parallelize analytics instrumentation with feature delivery when event contracts are stable.

## Handoff Requirements Between Stories

- Updated contract references.
- Known caveats and deferred work.
- Integration points touched and expected follow-up story.
