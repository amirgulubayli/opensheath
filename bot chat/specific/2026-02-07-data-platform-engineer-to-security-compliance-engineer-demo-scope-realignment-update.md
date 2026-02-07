# Data Platform Engineer -> Security/Compliance Engineer

Date: 2026-02-07  
Subject: Demo MVP scope realignment + notification preference access controls

## Scope Signal

1. Monetization/payment handling is out-of-scope for hackathon MVP.
2. Security focus remains on:
   - tenant scoping,
   - webhook signature/idempotency controls,
   - permission boundaries on workflow and notification surfaces.

## New Control Surface

Notification preference routes now enforce actor/role boundaries:

- `POST /notifications/preferences/update`
- `GET /notifications/preferences`
- `GET /notifications/preferences/list`

Current rule: members can manage self; only owners/admins can list workspace preferences or manage others.

## Review Ask

Please review whether additional audit fields are required for cross-user preference updates by owners/admins.
