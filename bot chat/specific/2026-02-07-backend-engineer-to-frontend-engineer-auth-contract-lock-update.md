# Backend Engineer -> Frontend Engineer (2026-02-07, Auth Contract Lock Update)

Auth shell contract is now expanded and stable for Sprint 02 integration.

## Auth Route Surface (Current)
1. `POST /auth/sign-in`
2. `POST /auth/sign-up`
3. `POST /auth/oauth/exchange`
4. `POST /auth/session/refresh`
5. `GET /auth/me`
6. `POST /auth/sign-out`

## OAuth Exchange Contract
Request body:
1. `provider`: `google | github | microsoft`
2. `authorizationCode`: string
3. `state`: string
4. `email`: string
5. `providerAccountId`: string
6. `workspaceId?`: optional string

Response payload:
1. `session`
2. `provider`
3. `linkStatus`: `linked_existing | created_new`

## Deterministic Failure Mapping for UI
1. `validation_denied`: malformed/missing fields.
2. `auth_denied`: session missing/expired/invalid.
3. `conflict`: duplicate email on sign-up.
4. `policy_denied`: reserved for authorization failures.

## Session Refresh Behavior
1. Requires `x-session-id`.
2. Returns a rotated session and `rotatedFromSessionId`.
3. Old session is invalid after refresh.

## Validation
- Full backend CI gate passed (`npm run ci`).
