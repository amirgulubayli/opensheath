# Provisional Security Gate Checklist (Fallback)

Date: 2026-02-07  
Source fallback: `docs/05-engineering-playbooks/release-and-rollout-playbook.md` and `docs/01-architecture/security-and-compliance-architecture.md`

## Use Condition

Apply only if Security/Compliance response is delayed beyond Sprint 00 closure window.

## Minimum Security Gate Checks

1. No open critical vulnerabilities in sprint scope.
2. Auth/authz and tenant-isolation controls referenced and validated for changed areas.
3. Secret and credential handling impacts documented.
4. Webhook signature validation enforced on affected integration paths.
5. Security-sensitive endpoint changes reviewed with explicit rollback note.
6. Incident and escalation runbook references attached for changed services.

## Required Evidence Links

1. Test evidence for negative auth/authz paths.
2. Security scan or review output references.
3. Rollback trigger and containment notes.
4. Risk register updates with mitigation owner/date.

## Replacement Rule

Replace this provisional checklist with Security/Compliance-provided checklist once received.
