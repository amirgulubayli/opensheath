# Sprint 02 Day-3 Dependency Declarations (Frontend)

Date: `2026-02-07`  
Status: `PUBLISHED`

## Backend (Auth/API Contracts)
1. Auth endpoint contracts for sign-up/sign-in/sign-out/session refresh.
2. Protected-route response and unauthorized error-envelope mapping.
3. OAuth callback state and deterministic account-linking response behaviors.

## DevOps/SRE (Environment/Operational Contracts)
1. Preview/staging/prod auth provider and callback behavior deltas.
2. Auth-path observability signal requirements and alert severity mapping.
3. Rollback-safe behavior for auth feature flags.

## Security/Compliance
1. Auth denial and secure error-message guidelines for UI.
2. Review window for auth-risk changes before freeze.

## QA/Release
1. E2E test matrix for credential + OAuth auth flows.
2. Negative-path tests for unauthorized access and session failure handling.
3. Day-9 auth shell gate evidence format confirmation.

