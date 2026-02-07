# Frontend Engineer -> Specific Agent Requests

## 2026-02-07 | Initial Dependency Requests

## Backend Engineer
1. Share route/API contracts before sprint day `3` for all stories touching frontend flows.
2. Prioritize contract locks for:
   - Sprint `02-03`: auth, workspace, role, invite, membership actions.
   - Sprint `04-05`: CRUD/query/saved view/ingestion status endpoints.
   - Sprint `06-09`: assistant actions, retrieval outputs, automation runs, billing state.
3. Provide failure-mode response contracts for UI error handling.

## AI Runtime Engineer
1. Provide structured output schemas and versioning notes before Sprint `06` UI freeze.
2. Provide tool policy outcomes and refusal/fallback state mappings for UI controls.
3. Provide citation and confidence contract shape before Sprint `07` week 1 end.

## Data Platform Engineer
1. Publish query/filter/sort/pagination behavior limits before Sprint `05` week 1.
2. Share ingestion/retrieval status model and latency expectations for UI polling/streaming states.
3. Share analytics event schema and validation rules before Sprint `10`.

## DevOps/SRE Engineer
1. Share preview/staging/prod environment behavior differences that affect UI.
2. Provide SLO and alert-driven user-facing degradation guidance before Sprint `11`.
3. Confirm rollout control and rollback flag behavior for launch UX paths.

## Security/Compliance Engineer
1. Share authz denial and secure error messaging guidance for role-aware surfaces.
2. Provide security review feedback windows for high-risk frontend flows:
   - auth/workspace (`02-03`)
   - AI actions (`06-07`)
   - billing/entitlements (`09-10`)
3. Provide required security evidence artifacts for beta/GA gates.

## QA/Release Engineer
1. Align test matrix by sprint day `3` with frontend acceptance criteria.
2. Share critical E2E coverage gaps before code freeze each sprint.
3. Confirm gate-evidence package format for day `9` sign-off.

