# Role-Based Sprint Planning Workspace

## Purpose

Translate the master roadmap into role-specific, sprint-by-sprint execution plans with explicit handoffs and gate evidence.

## Folder Structure

- `role-system-prompts/`: role-specialized system prompts with character, scope, and output contract.
- `sprint-00-inception-architecture-lock` through `sprint-11-reliability-release-and-ga-rollout`: sprint folders.
- Each sprint folder contains role subfolders with `section-contribution-plan.md`.

## Roles

- `frontend-engineer`
- `backend-engineer`
- `ai-runtime-engineer`
- `data-platform-engineer`
- `devops-sre-engineer`
- `security-compliance-engineer`
- `qa-release-engineer`

## How to Use

1. Start from the active sprint folder.
2. Open each role's `section-contribution-plan.md` and assign an owner.
3. Execute section steps (`00` to `06`) in order.
4. Track dependencies and risks daily in governance docs.
5. Collect gate evidence and run release decision at sprint end.

## Capacity Model (Default)

- One engineer per role lane.
- 15-20% reserved for integration defects and cross-role support.
- No non-critical scope additions after day 3.

## Source References

- Sprint roadmap: `docs/04-sprints/sprint-roadmap.md`
- Story source: `docs/03-backlog/master-story-catalog.md`
- Quality gates: `docs/00-governance/definition-of-ready-and-done.md`
- AI delivery protocol: `docs/06-ai-agent-execution/README.md`
- AI runtime execution tracker: `docs/07-role-sprint-plans/ai-runtime-engineer-execution-tracker.md`
