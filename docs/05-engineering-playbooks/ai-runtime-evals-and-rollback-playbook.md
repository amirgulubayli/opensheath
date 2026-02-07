# AI Runtime Evals and Rollback Playbook

## Purpose

Define the baseline evaluation and rollback process for AI runtime quality and safety controls.

## Scope

- Evals harness expectations (Sprint 00 baseline, Sprint 06-11 operational use).
- Regression thresholds for release gates.
- Rollback triggers and execution workflow.

## Evals Harness Baseline

## Dataset Buckets

1. `schema_conformance`: structured output validity checks.
2. `tenant_safety`: cross-tenant leakage negative tests.
3. `tool_policy`: unauthorized or high-risk action attempts.
4. `retrieval_grounding`: citation presence and evidence linkage.
5. `failure_recovery`: fallback behavior during model and tool failures.

## Run Cadence

1. Per PR on AI-runtime stories: targeted eval subset.
2. Daily on active AI sprints: full suite.
3. Before sprint gate review: full suite plus regression comparison.
4. Before GA decision: full suite plus canary-vs-baseline report.

## Minimum Thresholds by Stage

| Stage | Schema Conformance | Tenant Safety Negatives | Tool Policy Negatives | Citation Presence (when retrieval used) |
|---|---|---|---|---|
| Sprint 00-05 baseline | >= 95% | 100% blocked | 100% blocked | >= 90% |
| Sprint 06 AI action gate | >= 98% | 100% blocked | 100% blocked | >= 93% |
| Sprint 07 AI quality gate | >= 99% | 100% blocked | 100% blocked | >= 95% |
| Sprint 10 beta readiness | >= 99% | 100% blocked | 100% blocked | >= 95% |
| Sprint 11 GA launch | >= 99% | 100% blocked | 100% blocked | >= 96% |

## Failure Taxonomy

1. `schema_validation_failed`
2. `policy_block_expected_but_not_triggered`
3. `tenant_context_missing_or_invalid`
4. `citation_missing_when_required`
5. `unsafe_output_policy_violation`
6. `tool_call_replayed_or_duplicated`

## Rollback Triggers

Trigger immediate rollback or canary freeze when any condition is met:

1. Tenant safety negative test fails.
2. Tool policy negative test fails.
3. Schema conformance drops below stage threshold for two consecutive runs.
4. Production incident severity `SEV-1` or `SEV-2` linked to AI runtime model/prompt change.

## Rollback Workflow

1. Freeze rollout and keep existing traffic allocation.
2. Switch model routing to last known good policy version.
3. Revert prompt template version to last approved tag.
4. Disable high-risk tools via policy flag if incident involves action execution.
5. Publish incident handoff and mitigation owner in governance register.

## Evidence Package for Gate Review

1. Eval summary with pass/fail counts and trend delta.
2. Top failing cases and root-cause labels.
3. Rollback readiness confirmation for current active model/prompt versions.
4. Links to traces, logs, and runbook evidence.

## Role Responsibilities

- AI Runtime Engineer: owns eval suite, threshold reporting, and rollback recommendation.
- Backend Engineer: owns tool execution determinism and error taxonomy compliance.
- Security/Compliance Engineer: validates policy and safety control coverage.
- QA/Release Engineer: validates gate evidence format and release decision package.
