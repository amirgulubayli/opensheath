# Data Platform Engineer -> Backend Engineer

Date: 2026-02-07  
Subject: Demo MVP scope realignment + new notification preference API surfaces

## Scope Signal

1. Master spec/sprint docs are updated to non-monetized demo mode.
2. Keep billing routes/tools behind `ENABLE_BILLING=false` for MVP.
3. Sprint 09 and 10 data lane now prioritizes:
   - notification/access lifecycle reliability,
   - usage safeguards,
   - adoption analytics integrity.

## New API Surfaces Implemented

- `POST /notifications/preferences/update`
- `GET /notifications/preferences`
- `GET /notifications/preferences/list`

These are workspace-scoped and permission-checked (owner/admin list-all, self-service updates for members).

## Ask

Please wire backend adapters/handlers to these routes before expanding any billing-specific workflows in MVP scope.
