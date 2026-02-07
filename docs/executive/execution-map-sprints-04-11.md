# Execution Map (Sprints 04–11)

Date: 2026-02-07
Owner: Executive Engineering
Scope: Dependency-safe completion map from core workflows through GA

## End-to-End Flow Map (Unified)

1. Auth → session → protected routes (Sprint 02)
2. Workspace → membership → role gates (Sprint 03)
3. Project + document lifecycle → activity timeline (Sprint 04)
4. Ingest → parse → chunk → retry/dead-letter (Sprint 05)
5. Retrieval → citations → evidence panel (Sprint 07)
6. AI run → tool calls → safety checks (Sprint 06)
7. Integrations → automation rules → run history (Sprint 08)
8. Notifications → webhook delivery/replay → access sync (Sprint 09)
9. Usage safeguards + analytics integrity (Sprint 10)
10. Release readiness → rollout/rollback → GA (Sprint 11)

## Dependency-Safe Map (Sprints 04–11)

| Sprint | Gate | Flow Stage | Key Dependencies | Evidence Packet Reference |
|---|---|---|---|---|
| 04 | Core workflow gate | Project/document lifecycle + activity timeline | Sprint 03 tenant isolation gate; contract alignment for core domain | [docs/executive/sprints/sprint-04-core-workflow-gate.md](docs/executive/sprints/sprint-04-core-workflow-gate.md) |
| 05 | Discovery gate | Ingestion lifecycle + query/retrieval wiring | Sprint 04 core workflow gate; ingestion contracts + retry semantics | [docs/executive/sprints/sprint-05-discovery-gate.md](docs/executive/sprints/sprint-05-discovery-gate.md) |
| 06 | AI action gate | Tool registry + safe execution loop | Sprint 05 ingestion contracts; Sprint 03 authz/tenant guards | [docs/executive/sprints/sprint-06-ai-action-gate.md](docs/executive/sprints/sprint-06-ai-action-gate.md) |
| 07 | AI quality gate | Retrieval quality + citations + moderation | Sprint 06 AI action gate; retrieval/citation contracts | [docs/executive/sprints/sprint-07-ai-quality-gate.md](docs/executive/sprints/sprint-07-ai-quality-gate.md) |
| 08 | Automation gate | Connector lifecycle + automation eventing | Sprint 07 AI quality gate; event/idempotency contracts | [docs/executive/sprints/sprint-08-automation-gate.md](docs/executive/sprints/sprint-08-automation-gate.md) |
| 09 | Notification/access sync gate | Webhook replay + preference management | Sprint 08 automation gate; non-monetized scope override | [docs/executive/sprints/sprint-09-notification-access-sync-gate.md](docs/executive/sprints/sprint-09-notification-access-sync-gate.md) |
| 10 | Beta readiness gate | Usage safeguards + analytics integrity + hardening | Sprint 09 notification gate; security hardening requirements | [docs/executive/sprints/sprint-10-beta-readiness-gate.md](docs/executive/sprints/sprint-10-beta-readiness-gate.md) |
| 11 | GA launch gate | Reliability + rollout/rollback + GA checks | Sprint 10 beta readiness gate; release playbook | [docs/executive/sprints/sprint-11-ga-launch-gate.md](docs/executive/sprints/sprint-11-ga-launch-gate.md) |

## Evidence Bundle Pointers

- Data platform contract index: [bot chat/data-platform-engineer/contracts/contract-index-00-11.md](bot%20chat/data-platform-engineer/contracts/contract-index-00-11.md)
- Gate evidence packet standard (frontend template): [bot chat/frontend-engineer/templates/day-9-gate-evidence-packet-template.md](bot%20chat/frontend-engineer/templates/day-9-gate-evidence-packet-template.md)
- Release readiness playbook: [docs/05-engineering-playbooks/release-and-rollout-playbook.md](docs/05-engineering-playbooks/release-and-rollout-playbook.md)

## Non-Monetized Scope Guardrails

All flows in sprints 09–11 must enforce the demo scope overrides:

- No checkout or payment capture.
- `ENABLE_BILLING=false` in all demo environments.
- Billing-related terminology maps to demo access lifecycle and usage safeguards.

Reference: [docs/00-governance/demo-mvp-scope-overrides.md](docs/00-governance/demo-mvp-scope-overrides.md)

