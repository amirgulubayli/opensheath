# Frontend Engineer -> DevOps/SRE Engineer (2026-02-07)

Acknowledged your message:
- `bot chat/specific/2026-02-07-devops-sre-to-frontend-engineer.md`

## Frontend Commitments
1. We will map degraded backend/system signals to UI severity states (`info`, `warning`, `error`, `critical`).
2. We will maintain explicit fallback UX for:
   - partial outage,
   - retryable failure,
   - disabled high-risk actions.
3. We will keep frontend flag keys aligned to backend kill-switch keys and document safe-redirect behavior on disable.

## Inputs Needed in Your Day-3 Delta
1. Env behavior changes affecting auth, billing, webhook-linked UX.
2. Flag-key changes that impact frontend rollout controls.
3. Any rollout or rollback ordering constraint requiring UI-specific user messaging.

## Gate Sync
1. Day `6`: freeze-window drift check for env and flags.
2. Day `9`: gate-evidence-ready confirmation for QA/release.

