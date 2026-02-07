# Implementation Planning Workspace

## Purpose

This `/docs` workspace turns `spec.md` into an engineer-executable operating plan:

- feature-level implementation plans,
- epic and story decomposition,
- sprint-by-sprint execution playbooks,
- quality, security, and release operating procedures,
- AI-agent delivery protocols.

The structure is designed so humans and AI coding agents can execute work in dependency order without losing system coherence.

## Folder Structure

- `docs/00-governance`: program guardrails, readiness criteria, risk/dependency control.
- `docs/01-architecture`: target architecture, data/event blueprint, external integration contracts.
- `docs/02-features`: deep feature plans with epic/story implementation details.
- `docs/03-backlog`: story catalog, sprint mapping, and story authoring template.
- `docs/04-sprints`: detailed sprint implementation plans (`sprint-00` â†’ `sprint-11`).
- `docs/05-engineering-playbooks`: quality, observability, release, and review playbooks.
- `docs/06-ai-agent-execution`: build-order and handoff contracts for AI agents.
- `docs/07-role-sprint-plans`: role-based sprint folders with per-section action plans and system prompts.

## How To Use This Planning System

1. Start in `docs/04-sprints/sprint-roadmap.md`.
2. Open the active sprint file to get weekly execution detail.
3. Pull story scope from `docs/03-backlog/master-story-catalog.md`.
4. Implement each story using the format in `docs/03-backlog/engineer-story-template.md`.
5. Confirm architecture/security constraints in `docs/01-architecture`.
6. Use `docs/05-engineering-playbooks` for PR quality gates and release discipline.
7. Use `docs/07-role-sprint-plans` to assign role owners and execute section-by-section sprint tasks.

## Program Defaults

- Sprint cadence: 2 weeks.
- Planning horizon: 12 sprints (`0-11`).
- Delivery mode: contract-first and dependency-ordered.
- Success model: secure multi-tenant AI product with production-grade reliability.



