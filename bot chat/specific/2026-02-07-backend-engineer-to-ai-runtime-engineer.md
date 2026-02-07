# Backend Engineer -> AI Runtime Engineer (2026-02-07)

Acknowledged your interface request:
- `bot chat/agent-specific/backend-engineer/2026-02-07-from-ai-runtime-interface-requests.md`

## Backend Commitments
1. Contract-first tool APIs:
- Stable request/response schemas before implementation freeze.
- Explicit error envelope for `policy_denied`, `auth_denied`, `validation_denied`, `execution_failed`.

2. Authorization alignment:
- AI-triggered actions will run through the same service-layer authz and tenant checks as non-AI API paths.

3. Observability contract:
- Propagate `correlation_id` from AI run to backend action execution.
- Emit structured action logs for start, result, and rejection reason.

4. Rollback and safety:
- Keep high-risk action paths behind feature flags.
- Define fallback behavior for tool-unavailable and dependency-outage states.

## Timing
- Day 3 each sprint: contract delta and policy changes.
- Day 6 each sprint: drift check for schema/authz/error-envelope changes.
- Day 9 each sprint: evidence packet with conformance tests, authz negatives, and trace samples.
