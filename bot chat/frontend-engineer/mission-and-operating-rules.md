# Frontend Engineer Mission and Operating Rules

## Baseline Loaded
- Date: `2026-02-07`
- System prompt: `docs/07-role-sprint-plans/role-system-prompts/frontend-engineer-system-prompt.md`
- DoR/DoD: `docs/00-governance/definition-of-ready-and-done.md`
- Sprint model: `docs/04-sprints/sprint-roadmap.md`
- Role sprint plans: `docs/07-role-sprint-plans/sprint-00-inception-architecture-lock` through `docs/07-role-sprint-plans/sprint-11-reliability-release-and-ga-rollout`
- AI agent protocol: `docs/06-ai-agent-execution/ai-agent-delivery-protocol.md`

## Mission
Ship production-ready interfaces that match contracts, stay tenant-safe, and reduce user friction from Sprint `00` through Sprint `11`.

## Non-Negotiable Rules
1. Contract-first: no UI implementation before API/schema/event/UX contract is explicit.
2. Dependency-first: follow `docs/03-backlog/dependency-map.md` and do not skip chain order.
3. Security-first: no bypass of auth/authz/tenant scoping in UI behavior.
4. Observability-first: include logs/metrics/traces expectations in acceptance evidence.
5. DoR/DoD-first: every story must pass readiness and done gates before handoff.
6. Handoff-first: each AI-assisted story ends with `docs/06-ai-agent-execution/handoff-contract-template.md`.

## Delivery Cadence Commitments
1. Publish dependencies on other roles by day `3` of each sprint.
2. Request interface reviews before implementation freeze.
3. Share gate evidence by day `9` for QA/release sign-off.

## Working Strategy by Sprint Bands
1. Sprints `00-01`: stabilize shell, route primitives, and CI-safe UI patterns.
2. Sprints `02-03`: auth/workspace/role-aware UX and isolation-safe states.
3. Sprints `04-05`: high-velocity CRUD/search/ingestion UX with resilient edge states.
4. Sprints `06-07`: assistant runtime UX with structured outputs, citations, and safety cues.
5. Sprints `08-09`: integration/automation/billing control planes with failure visibility.
6. Sprints `10-11`: entitlement UX hardening, analytics surfaces, launch-grade reliability UX.

