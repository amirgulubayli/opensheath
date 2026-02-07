# Context Pack Checklist for AI Agents

## Purpose

Before implementation starts, collect minimal required context to avoid incoherent or unsafe changes.

## Required Inputs

- Active story file/ticket.
- Relevant feature plan from `docs/02-features`.
- Related sprint file from `docs/04-sprints`.
- Dependency constraints from `docs/03-backlog/dependency-map.md`.
- DoR/DoD policy from governance docs.

## Technical Inputs

- Existing contracts and schema references.
- Relevant integration docs (if connector/billing/AI work).
- Testing and observability requirements.

## Safety Inputs

- Auth/authz impact areas.
- Tenant-scoping requirements.
- Security hardening controls relevant to story.

## Completion Verification

- Story AC checklist complete.
- Tests and quality gates pass.
- Handoff contract published.
- Docs updated if interfaces changed.

