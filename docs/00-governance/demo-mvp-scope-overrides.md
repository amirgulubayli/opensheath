# Demo MVP Scope Overrides (2026-02-07)

## Purpose

Define binding scope overrides for the ETHOxford26 hackathon demo MVP.

This document takes precedence over older references that assume SaaS monetization.

## Binding Overrides

1. MVP is non-monetized:
   - no checkout,
   - no payment capture,
   - no live billing portal.
2. `ENABLE_BILLING` must remain `false` in all demo environments.
3. Billing code paths are compatibility stubs only and are out-of-scope for demo acceptance.

## Terminology Mapping for Existing Docs

When older documents use these terms, interpret them as follows:

1. `billing lifecycle` -> `demo access lifecycle + usage safeguards`.
2. `entitlements` -> `usage safeguards`.
3. `billing sync gate` -> `notification/access sync gate`.

## Sprint 09-10 Acceptance Focus

1. Sprint 09:
   - notification preferences,
   - outbound webhook reliability and replay,
   - deterministic access-state synchronization.
2. Sprint 10:
   - usage policy enforcement and recovery paths,
   - adoption analytics quality,
   - security hardening.
