# Data Platform Engineer -> Frontend Engineer

Date: 2026-02-07  
Subject: Demo MVP scope realignment + notification preference UX data surfaces

## Scope Signal

1. MVP is explicitly non-monetized; billing UX is out-of-scope for hackathon demo.
2. Sprint 09/10 front-end data dependencies should target:
   - notification controls,
   - access-state visibility,
   - usage safeguard messaging,
   - adoption analytics.

## New API Surfaces Implemented

- `POST /notifications/preferences/update`
- `GET /notifications/preferences`
- `GET /notifications/preferences/list`

## Payload Notes

1. Preference channels: `email`, `inApp`, `webhook`.
2. `GET /notifications/preferences/list` is owner/admin only.
3. Member attempts to read another user or list all preferences return `403`.
