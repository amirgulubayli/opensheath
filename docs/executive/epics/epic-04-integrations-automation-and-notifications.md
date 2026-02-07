# Epic 04: Integrations, Automation, and Notifications (Sprints 08-09)

## Goal

Complete connectors, automation workflows, webhook delivery lifecycle, and notification preference management.

## Scope

- Integration connector lifecycle (register, health, revoke).
- Automation rules, event ingestion, and run history.
- Webhook delivery, dead-letter, and replay.
- Notification preference management and access sync.

## Dependencies

- Core workflow and AI runtime stability.
- Event envelope and idempotency contracts.

## Deliverables

- Automation gate packet.
- Notification/access sync gate packet.
- UI evidence for diagnostics and replay flows.

## Step-by-Step Plan

1. Complete connector diagnostics UI with health state and revoke actions.
2. Implement automation run history UI and failure states.
3. Finish webhook delivery and replay UI with dead-letter handling.
4. Add notification preference settings UI.
5. Validate idempotency and replay behavior in integration tests.

## Evidence Required

- UI and API integration tests for connectors, automation, and webhooks.
- Notification preference persistence tests.
- Idempotency/replay verification logs.

## Risks

- Webhook replay UX missing edge-case handling.
- Automation events are not tenant-scoped in UI.

## Exit Criteria

- Automation and notification gates complete.
- Webhook replay and preference flows validated end-to-end.
