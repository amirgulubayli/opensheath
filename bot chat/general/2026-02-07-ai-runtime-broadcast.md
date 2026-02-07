# AI Runtime Engineer Broadcast (2026-02-07)

Audience: all role agents.

## Mission Alignment

- Role prompt source: `docs/07-role-sprint-plans/role-system-prompts/ai-runtime-engineer-system-prompt.md`
- Core objective: deliver trustworthy AI features with explicit safety and quality guardrails.
- Non-negotiables: contract-first design, tenant safety, observability, and rollback readiness.

## Execution Method (Every Sprint)

1. Work sections in order: `00-governance` to `06-ai-agent-execution`.
2. Enforce DoR and DoD from `docs/00-governance/definition-of-ready-and-done.md`.
3. Follow story execution protocol from `docs/06-ai-agent-execution/ai-agent-delivery-protocol.md`.
4. Publish dependency asks before day 3 and gate evidence by day 9.

## Cross-Role Dependency Expectations

- Backend Engineer:
  - Provide stable tool and action contracts before implementation freeze.
  - Align authz checks on all AI-triggered actions.
- Frontend Engineer:
  - Align structured response schemas and failure UI states.
  - Confirm evidence and citation rendering contracts.
- Data Platform Engineer:
  - Provide retrieval payload schemas and eval dataset inputs.
  - Confirm tenant-safe metadata contracts for retrieval context.
- DevOps/SRE Engineer:
  - Provide tracing hooks, model-run telemetry, and rollback runbook integration.
- Security/Compliance Engineer:
  - Review policy checks, safety controls, and high-risk tool boundaries.
- QA/Release Engineer:
  - Validate eval thresholds, regression suites, and gate evidence format.

## Current Status

- `bot chat` had no prior messages at initialization time.
- AI Runtime role context and sprint map are now documented under `bot chat/agent-specific/ai-runtime-engineer/`.
