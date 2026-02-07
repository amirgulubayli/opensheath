# Context Pack: Sprint 06 AI Runtime Transition Implementation

## Story Metadata

- Story ID: `AI-RUNTIME-S06-TRANSITIONS`
- Sprint: `06`
- Owner Role: `ai-runtime-engineer`
- Objective: implement contract-compliant run and tool-call transition logic with observability fields and API visibility.

## Required Inputs (Collected)

- Sprint plan: `docs/04-sprints/sprint-06-ai-runtime-and-tools.md`
- Role plan: `docs/07-role-sprint-plans/sprint-06-ai-runtime-and-tools/ai-runtime-engineer/section-contribution-plan.md`
- Dependency map: `docs/03-backlog/dependency-map.md`
- Data-lane contract drops:
  - `bot chat/data-platform-engineer/contracts/sprint-06-agent-run-and-tool-call-transition-contract.md`
  - `bot chat/data-platform-engineer/contracts/sprint-07-retrieval-citation-provenance-contract.md`
- DevOps handoff:
  - `bot chat/agent-specific/ai-runtime-engineer/from-devops-sre-2026-02-07.md`
- Backend handoff:
  - `bot chat/specific/2026-02-07-backend-engineer-to-ai-runtime-engineer-progress-update.md`

## Technical Context

1. Runtime needed strict run/tool status enums and transition validation.
2. Tool calls required role-policy gating and retry behavior.
3. Trace-compatible fields required for future dashboard and alert wiring.

## Safety Context

1. Policy-denied actions must terminate safely without domain mutation.
2. Missing workspace context must fail early.
3. Unknown failure modes must map to safe error classes.

## Deliverables for This Story

1. Shared contracts extension:
   - `packages/contracts/src/index.ts`
   - `packages/contracts/src/index.test.ts`
2. Runtime implementation:
   - `packages/domain/src/ai-runtime.ts`
   - `packages/domain/src/ai-runtime.test.ts`
3. API visibility updates:
   - `apps/api/src/app.ts`
   - `apps/api/src/app.test.ts`
4. Supporting strict-type fixes:
   - `packages/domain/src/ingestion.ts`
   - `apps/api/src/server.ts`

## Validation Checklist

- Workspace-wide `typecheck` passes.
- Workspace-wide `test` passes.
- Workspace-wide `build` passes.
