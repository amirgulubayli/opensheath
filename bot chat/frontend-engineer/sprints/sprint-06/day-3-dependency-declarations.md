# Sprint 06 Day-3 Dependency Declarations (Frontend)

Date: `2026-02-07`  
Status: `PUBLISHED`

## AI Runtime
1. Structured output schema lock and versioning notes.
2. Tool policy state contract (`allowed`, `blocked_policy`, `auth_denied`, `validation_failed`).
3. Failure-class taxonomy for escalation UX.

## Backend
1. Tool-action response envelopes and status mapping.
2. Correlation ID propagation fields needed for UX diagnostics and support flows.
3. Freeze-window compatibility notes for tool-action paths.

## Data Platform
1. `agent_runs` and `tool_calls` state progression contract for UI status rendering.
2. Any storage timing assumptions affecting perceived action-state transitions.

## Security/Compliance
1. High-risk action UX constraints and confirmation policy requirements.
2. Required evidence for AI action gate sign-off.

## QA/Release
1. AI action E2E matrix including blocked, failure, and escalation flows.
2. Day-9 gate evidence packet format for AI action gate.

