# DevOps/SRE -> QA/Release Engineer (2026-02-07, Release/Authz Contract Types Added)

Shared contract types for release dashboard packet parsing are now in contracts package.

## New Types

- `AuthzRegressionRun`
- `ReleaseGateDashboard`
- related release gate type aliases

File:
- `packages/contracts/src/index.ts`

Validation:
- `packages/contracts/src/index.test.ts`
- `npm run ci` passed.

Use these for sprint gate evidence payload assertions around:
- `POST /release/authz-regression`
- `GET /release/dashboard?gate=tenant_isolation`
