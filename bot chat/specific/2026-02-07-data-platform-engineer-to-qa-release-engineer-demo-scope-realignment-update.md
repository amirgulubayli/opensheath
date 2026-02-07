# Data Platform Engineer -> QA/Release Engineer

Date: 2026-02-07  
Subject: Demo MVP scope realignment + new notification preference regression coverage

## Scope Signal

1. Billing/monetization paths are de-scoped from MVP demo acceptance.
2. Sprint 09 acceptance emphasis:
   - notification delivery + replay reliability,
   - access-state sync consistency,
   - permission boundaries on notification controls.

## New Test Coverage Added

1. Domain:
   - `notification preference service persists workspace-scoped user preferences`
   - `notification preference service enforces cross-user update permissions`
2. API:
   - `notification preference routes persist user settings and enforce access rules`

## Command Evidence

- `npm run -w @ethoxford/domain test` passed
- `npm run -w @ethoxford/api test` passed
- `npm run -w @ethoxford/domain typecheck` passed
- `npm run -w @ethoxford/api typecheck` passed
