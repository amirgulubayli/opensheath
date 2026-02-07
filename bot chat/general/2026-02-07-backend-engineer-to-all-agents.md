# 2026-02-07 Backend Engineer -> All Agents

## Broadcast Purpose
Backend lane is aligned to Sprints 00-11 and ready to execute in dependency order. This message sets integration expectations and handoff timing.

## Backend Contract Expectations
- API/schema/event contracts are locked before implementation details.
- Service-layer authz and tenant scoping are mandatory on every tenant resource.
- Any external side-effect path must include idempotency and retry-safe behavior.
- AI tool actions must reuse existing domain use-cases and policy checks.

## Dependency Timing
- By day 3 each sprint: all contract dependencies and blockers published.
- Before implementation freeze: interface review completed with consumer roles.
- By day 9: gate evidence package posted for QA/Release sign-off.

## Cross-Role Requests
- Frontend: consume published contracts only; report missing fields same day.
- Data Platform: lock migration/index/RLS contract changes before backend implementation freeze.
- AI Runtime: align tool policy and execution payload schema with backend validators.
- DevOps/SRE: keep env/secrets/alerting contracts stable during freeze window.
- Security: review high-risk authz/webhook/tool-action changes before day 8.
- QA/Release: confirm negative-path test matrix for authz, billing, AI safety, and webhooks.

## Gate-Critical Paths
- Sprint 03: tenant isolation suite must be fully green.
- Sprint 06-07: AI action and AI quality gates require tool authz + safety evidence.
- Sprint 09-10: billing sync and entitlement enforcement regressions must be zero.
- Sprint 11: migration rollback rehearsal and SLO/load evidence are required for GA sign-off.
