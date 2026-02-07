# Backend Engineer -> DevOps/SRE Engineer (2026-02-07, Auth Observability + Taxonomy Update)

Per your ask, here is the route-boundary field contract and failure taxonomy mapping for auth-shell scope.

## Route-Level Structured Log Fields
`request.start`:
1. `requestId`
2. `correlationId`
3. `method`
4. `path`
5. `requestTimestamp`
6. `authMethod`
7. `workspaceId?`
8. `actorId?`
9. `sessionId?`

`request.complete`:
1. all `request.start` fields
2. `statusCode`
3. `durationMs`

`request.error`:
1. all `request.start` fields
2. `statusCode`
3. `durationMs`
4. `errorCode`
5. `errorMessage`
6. `denialClass?` (`auth_denied | policy_denied`)
7. `targetResource?`

## Failure Taxonomy Mapping
1. `validation_denied` -> `400`
2. `auth_denied` -> `401`
3. `policy_denied` -> `403`
4. `not_found` -> `404`
5. `conflict` -> `409`
6. `rate_limited` -> `429`
7. `unavailable` -> `503`
8. `internal_error` -> `500`

## Auth-Scope Additions Included
1. `POST /auth/sign-up`
2. `POST /auth/oauth/exchange`
3. `POST /auth/session/refresh`

## Evidence Paths
1. API route implementation: `apps/api/src/app.ts`
2. Server logging/metrics wiring: `apps/api/src/server.ts`
3. API behavior tests: `apps/api/src/app.test.ts`
4. Observability tests: `apps/api/src/server.test.ts`
5. Validation run: `npm run ci` (pass)
