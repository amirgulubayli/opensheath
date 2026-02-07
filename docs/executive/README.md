# Executive Log and Master Plan

This folder contains the executive consolidation of cross-lane progress and the unified finish plan for the demo MVP scope (non-monetized).

## Documents

1. [progress-summary.md](progress-summary.md)
   - Consolidated status across backend, frontend, data platform, AI runtime, and DevOps/SRE.
   - Implemented, in-progress, and remaining scope with dependencies.
2. [setup-guide.md](setup-guide.md)
   - Fresh-clone setup instructions for running the full app locally.
3. [master-plan.md](master-plan.md)
   - Full end-to-end step-by-step execution plan to complete the spec.
   - Workstream sequencing, quality gates, and release readiness.
4. [epics-and-sprints.md](epics-and-sprints.md)
   - Executive epics for remaining work.
   - Sprint-by-sprint completion plan and evidence requirements.
5. Epics (one file per epic):
   - [epics/epic-00-lane-alignment-and-evidence.md](epics/epic-00-lane-alignment-and-evidence.md)
   - [epics/epic-01-foundation-and-auth-completion.md](epics/epic-01-foundation-and-auth-completion.md)
   - [epics/epic-02-core-domain-and-ingestion-completion.md](epics/epic-02-core-domain-and-ingestion-completion.md)
   - [epics/epic-03-ai-runtime-and-safety-completion.md](epics/epic-03-ai-runtime-and-safety-completion.md)
   - [epics/epic-04-integrations-automation-and-notifications.md](epics/epic-04-integrations-automation-and-notifications.md)
   - [epics/epic-05-analytics-security-and-ga.md](epics/epic-05-analytics-security-and-ga.md)
   - [epics/epic-06-productization-and-ga-convergence.md](epics/epic-06-productization-and-ga-convergence.md)
6. Sprints (one file per sprint):
   - [sprints/sprint-00-architecture-gate.md](sprints/sprint-00-architecture-gate.md)
   - [sprints/sprint-01-ci-cd-gate.md](sprints/sprint-01-ci-cd-gate.md)
   - [sprints/sprint-02-auth-shell-gate.md](sprints/sprint-02-auth-shell-gate.md)
   - [sprints/sprint-03-tenant-isolation-gate.md](sprints/sprint-03-tenant-isolation-gate.md)
   - [sprints/sprint-04-core-workflow-gate.md](sprints/sprint-04-core-workflow-gate.md)
   - [sprints/sprint-05-discovery-gate.md](sprints/sprint-05-discovery-gate.md)
   - [sprints/sprint-06-ai-action-gate.md](sprints/sprint-06-ai-action-gate.md)
   - [sprints/sprint-07-ai-quality-gate.md](sprints/sprint-07-ai-quality-gate.md)
   - [sprints/sprint-08-automation-gate.md](sprints/sprint-08-automation-gate.md)
   - [sprints/sprint-09-notification-access-sync-gate.md](sprints/sprint-09-notification-access-sync-gate.md)
   - [sprints/sprint-10-beta-readiness-gate.md](sprints/sprint-10-beta-readiness-gate.md)
   - [sprints/sprint-11-ga-launch-gate.md](sprints/sprint-11-ga-launch-gate.md)

## Sources of Truth (Primary)

- Product and sprint intent: [spec.md](../../spec.md), [docs/04-sprints/sprint-roadmap.md](../04-sprints/sprint-roadmap.md)
- Definition of Ready/Done: [docs/00-governance/definition-of-ready-and-done.md](../00-governance/definition-of-ready-and-done.md)
- Testing and release gates: [docs/05-engineering-playbooks/testing-strategy.md](../05-engineering-playbooks/testing-strategy.md), [docs/05-engineering-playbooks/release-and-rollout-playbook.md](../05-engineering-playbooks/release-and-rollout-playbook.md)
- Lane progress logs:
  - Backend: [bot chat/general/2026-02-07-backend-implementation-progress-update.md](../../bot%20chat/general/2026-02-07-backend-implementation-progress-update.md)
  - Backend (Phase 2): [bot chat/general/2026-02-07-backend-implementation-progress-update-phase-2.md](../../bot%20chat/general/2026-02-07-backend-implementation-progress-update-phase-2.md)
  - Backend (Phase 3): [bot chat/general/2026-02-07-backend-implementation-progress-update-phase-3-auth-hardening.md](../../bot%20chat/general/2026-02-07-backend-implementation-progress-update-phase-3-auth-hardening.md)
  - Frontend: [bot chat/frontend-engineer/progress-log.md](../../bot%20chat/frontend-engineer/progress-log.md)
  - Data Platform: [bot chat/data-platform-engineer/progress-log-2026-02-07.md](../../bot%20chat/data-platform-engineer/progress-log-2026-02-07.md)
  - AI Runtime: [bot chat/general/2026-02-07-implementation-progress.md](../../bot%20chat/general/2026-02-07-implementation-progress.md)
  - AI Runtime (detail): [bot chat/agent-specific/ai-runtime-engineer/progress-log.md](../../bot%20chat/agent-specific/ai-runtime-engineer/progress-log.md)
  - DevOps/SRE: [bot chat/general/2026-02-07-devops-sre-progress-update-11.md](../../bot%20chat/general/2026-02-07-devops-sre-progress-update-11.md), [bot chat/general/2026-02-07-devops-sre-progress-update-15.md](../../bot%20chat/general/2026-02-07-devops-sre-progress-update-15.md), [bot chat/general/2026-02-07-devops-sre-progress-update-19.md](../../bot%20chat/general/2026-02-07-devops-sre-progress-update-19.md)
