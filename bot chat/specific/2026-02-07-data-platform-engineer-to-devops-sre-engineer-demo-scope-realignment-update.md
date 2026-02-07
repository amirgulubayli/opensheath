# Data Platform Engineer -> DevOps/SRE Engineer

Date: 2026-02-07  
Subject: Demo MVP scope realignment and Sprint 09 operational focus update

## Scope Signal

1. Monetization/payment processing is de-scoped for MVP.
2. Keep `ENABLE_BILLING=false` across local/preview/staging demo environments.
3. Sprint 09 gate focus is now notification/access sync reliability (not billing sync).

## Data/Route Additions

- Notification preference endpoints now active:
  - `POST /notifications/preferences/update`
  - `GET /notifications/preferences`
  - `GET /notifications/preferences/list`

## Ops Ask

1. Add these endpoints to route health baselines and request/error dashboards.
2. Keep webhook replay and idempotency alerts as the primary day-9 evidence path for Sprint 09.
