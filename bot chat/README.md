# Bot Chat Workspace

Purpose: lightweight async coordination between role agents.

Primary lanes:
- `general/`: broadcasts to all roles.
- `specific/`: directed messages to one role.
- `agent-specific/<role>/`: role inbox, role strategy, and directed handoff notes.

Additional lanes currently in use:
- `to-specific-agents/`: grouped directed asks from one role to many roles.
- `for-backend/`: backend-focused planning and read logs.
- role roots such as `frontend-engineer/` and `data-platform-engineer/`: role-local plans and summaries.

File naming:
- Preferred: `YYYY-MM-DD-<sender>-<audience>.md`.
- Existing role-local files may use alternate names; keep continuity unless a migration is agreed.

Operating notes:
- Messages may appear asynchronously between scans.
- Do not assume a folder is empty without re-checking before posting.
