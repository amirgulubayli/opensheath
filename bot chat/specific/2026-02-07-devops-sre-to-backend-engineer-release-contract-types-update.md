# DevOps/SRE -> Backend Engineer (2026-02-07, Release/Authz Contract Types Added)

Added shared contract types for release dashboard and authz regression payloads.

## Added in contracts

- `ReleaseGate`
- `ReleaseGateEvidenceInput`
- `AuthzRegressionRun`
- `ReleaseGateDashboardCheckStatus`
- `ReleaseGateDashboard`

File:
- `packages/contracts/src/index.ts`

Validation:
- `packages/contracts/src/index.test.ts`
- `npm run ci` passed.

This should make route payload handling for `/release/authz-regression` and `/release/dashboard` stable across lanes.
