# Story Dependency Map

## Purpose

Provide execution order constraints so engineers and AI agents implement stories in coherent sequence.

## Critical Dependency Chains

## Chain A: Foundation to Core Product

1. `F1-E1-S1` → `F1-E1-S2` → `F1-E1-S3`
2. `F1-E2-S1` + `F1-E2-S2` → `F1-E2-S3`
3. `F2-E1-S1` + `F2-E1-S3` → `F2-E2-S1`
4. `F2-E3-S1` → `F2-E3-S2` → `F2-E3-S3`
5. `F3-E1-S1` + `F3-E1-S2` → `F3-E2-S2`

## Chain B: Ingestion and AI Runtime

1. `F5-E1-S1` → `F5-E1-S2` → `F5-E1-S3`
2. `F4-E1-S1` → `F4-E1-S3` → `F4-E2-S1`
3. `F4-E2-S1` → `F4-E2-S2` → `F4-E2-S3`
4. `F5-E2-S1` + `F5-E2-S2` → `F5-E3-S1`
5. `F4-E3-S1` + `F5-E3-S1` → quality gate sign-off

## Chain C: Integrations to Monetization

1. `F6-E1-S1` + `F6-E1-S2` → `F6-E2-S1`
2. `F6-E2-S1` → `F6-E2-S2` → `F6-E2-S3`
3. `F7-E1-S2` requires webhook pipeline security from `F6-E2-S3`
4. `F7-E2-S1` → `F7-E2-S2` → `F7-E2-S3`

## Chain D: Hardening and Launch

1. `F8-E1-S1` informs `F8-E1-S2` and `F8-E1-S3`
2. `F8-E2-S1` precedes `F8-E2-S2` tuning
3. `F8-E3-S1` + `F8-E3-S2` must complete before `F8-E3-S3`

## Parallelization Guidance

Safe to parallelize:

- UI work and service implementation after contract lock.
- Notification templates while webhook engine is in progress.
- Analytics instrumentation while entitlement enforcement matures.

Avoid parallelization when:

- Schema contracts are not finalized.
- Authorization policy stories are incomplete.
- Tool registry policy is incomplete for AI action features.

## Blocker Handling Rules

- Any blocked critical-path story triggers same-day dependency review.
- If unresolved in 24h, escalate and re-baseline sprint scope.
- Document all blocker-driven sequence changes in this file.

