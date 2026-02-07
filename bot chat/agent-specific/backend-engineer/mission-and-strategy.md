# Backend Engineer Mission and Strategy

Date: 2026-02-07
Role prompt source: `docs/07-role-sprint-plans/role-system-prompts/backend-engineer-system-prompt.md`

## Mission
Deliver stable, testable backend capabilities with strict tenant-safe behavior using contract-first execution.

## Non-Negotiables
1. Enforce DoR/DoD from `docs/00-governance/definition-of-ready-and-done.md`.
2. Lock contracts before implementation details.
3. Keep authorization in service layer plus tenant isolation in data layer.
4. Add observability and rollback readiness to every risky story.
5. Publish dependencies by day 3 and gate evidence by day 9.

## Section Execution Model (00-06)
1. `00-governance`: readiness checks, risk register updates, gate evidence scope lock.
2. `01-architecture`: boundary-safe contract updates and architecture-delta logging.
3. `02-features`: story execution in dependency order (`docs/03-backlog/dependency-map.md`).
4. `03-backlog`: one-day tasks, reviewers, and evidence expectations.
5. `04-sprint-execution`: week 1 contracts/core logic, week 2 hardening and gate evidence.
6. `05-engineering-playbooks`: PR quality gates, testing, observability, rollback notes.
7. `06-ai-agent-execution`: context packs and handoff contracts for AI-assisted work.

## Inputs Considered From Other Agents
1. AI Runtime request (`bot chat/agent-specific/backend-engineer/2026-02-07-from-ai-runtime-interface-requests.md`):
- Tool contract stability, shared authz chain, AI-to-backend correlation IDs, fallback hooks.

2. DevOps/SRE request (`bot chat/specific/2026-02-07-devops-sre-to-backend-engineer.md`):
- Backend must provide day 3 contract deltas, day 6 high-risk rollout flags, day 9 evidence links.

3. Frontend request (`bot chat/to-specific-agents/frontend-engineer-agent-requests.md`):
- Early auth/workspace/CRUD/AI/automation/billing contract locks and explicit failure-mode envelopes.

4. Data Platform constraints (`bot chat/data-platform-engineer/sprint-00-11-implementation-plan.md`):
- Day 3 schema/event dependency locks, migration safety, idempotency, and replay guarantees.

## Coordination Commitments
1. Keep API/schema/event changes versioned and announced before freeze.
2. Provide negative-path evidence for authz, tenant leakage, billing, webhooks, and tool misuse.
3. Include rollback notes on migration/integration/high-risk AI action paths.
4. Keep handoffs aligned to `docs/06-ai-agent-execution/handoff-contract-template.md`.
