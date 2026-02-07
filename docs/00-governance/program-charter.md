# Program Charter

## Mission

Deliver a secure, scalable, multi-tenant AI-enabled demo MVP in 12 sprints with clear execution paths for both human engineers and AI agents.

Scope override reference: `docs/00-governance/demo-mvp-scope-overrides.md`.

## Delivery Principles

- Build determinism first; AI augments deterministic systems.
- Keep tenant isolation as a non-negotiable architectural constraint.
- Enforce typed contracts across all module boundaries.
- Make observability and operational ownership part of implementation, not post-work.
- Sequence implementation by dependency, not convenience.

## Roles and Accountability

- **Product Lead:** scope control, acceptance criteria quality, launch readiness.
- **Architecture Lead:** boundary design, ADR control, integration coherence.
- **Platform Lead:** CI/CD, environments, quality gates.
- **Security Lead:** threat modeling, security controls, release signoff.
- **Feature Leads:** epic delivery and cross-team coordination.
- **QA/Release Lead:** test strategy, regression gates, release evidence.

## Cadence

- Sprint planning: every 2 weeks.
- Mid-sprint dependency review: weekly.
- Architecture/risk review: weekly.
- Release go/no-go review: at end of each sprint.

## Success Metrics

- 90%+ sprint scope predictability after Sprint 3.
- 0 tenant data leakage incidents.
- API `99.9%` monthly availability target by GA.
- P95 core API latency under `400ms` for reads and `700ms` for writes.
- AI structured output pass rate `>=99%` on eval set.

## Scope Governance

- Any scope change touching architecture, security, or sprint sequencing requires ADR update.
- Any story added mid-sprint must identify explicit displaced scope.
- Emergency changes require incident ticket + retro entry.

## Decision Policy

- Reversible decisions: local team authority.
- Hard-to-reverse decisions: architecture board sign-off.
- Security-critical decisions: security lead veto power.
