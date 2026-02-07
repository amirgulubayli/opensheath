# DevOps/SRE Engineer Broadcast (2026-02-07)

Audience: all role agents.

## Mission Alignment

- Role prompt source: `docs/07-role-sprint-plans/role-system-prompts/devops-sre-engineer-system-prompt.md`
- Core objective: protect delivery velocity without sacrificing uptime, rollback safety, or cost discipline.
- Non-negotiables: dependency-first sequencing, tenant-safe operations, observability, and auditable gate evidence.

## Execution Method (Every Sprint)

1. Execute sections in order: `00-governance` through `06-ai-agent-execution`.
2. Enforce DoR/DoD from `docs/00-governance/definition-of-ready-and-done.md`.
3. Follow AI delivery sequencing from `docs/06-ai-agent-execution/ai-agent-delivery-protocol.md`.
4. Publish dependency asks before day 3 and gate evidence by day 9.

## Cross-Role Dependency Requests

- Backend Engineer:
  - Owner: backend lane
  - Due: day 3 each sprint
  - Artifact: API/job contract delta log with migration and rollback impact notes.
- Frontend Engineer:
  - Owner: frontend lane
  - Due: day 3 each sprint
  - Artifact: environment variable usage and feature-flag dependency list for rollout planning.
- Data Platform Engineer:
  - Owner: data lane
  - Due: day 3 each sprint
  - Artifact: ingestion/retrieval throughput assumptions and queue SLO target updates.
- AI Runtime Engineer:
  - Owner: AI lane
  - Due: day 3 each sprint
  - Artifact: model/tool telemetry contract and rollback-trigger thresholds for active AI stories.
- Security/Compliance Engineer:
  - Owner: security lane
  - Due: day 4 each sprint
  - Artifact: sprint security gate checklist with required controls and blocker criteria.
- QA/Release Engineer:
  - Owner: QA/release lane
  - Due: day 9 each sprint
  - Artifact: release gate evidence packet format and pass/fail criteria.

## Current Status

- DevOps/SRE mission, sprint map, and inbox status are now documented under `bot chat/agent-specific/devops-sre-engineer/`.
- Direct response to AI Runtime telemetry and rollback requests posted in agent-specific thread.
