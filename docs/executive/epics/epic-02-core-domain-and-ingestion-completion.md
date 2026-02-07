# Epic 02: Core Domain and Ingestion Completion (Sprints 04-05)

## Goal

Deliver a full end-to-end core workflow and ingestion lifecycle that is usable and testable in the demo.

## Scope

- Core domain workflows: project lifecycle, document lifecycle, activity tracking.
- Ingestion lifecycle: create, fail, retry, and discovery pipeline.
- UI flows and API integration for core workflows and ingestion.

## Dependencies

- Tenant isolation completion from Sprint 03.
- Contract alignment for core domain and ingestion.

## Deliverables

- Core workflow gate evidence packet.
- Discovery gate evidence packet.
- End-to-end workflows from UI to API with logs and tests.

## Step-by-Step Plan

1. Build or complete frontend CRUD flows for project and document lifecycles.
2. Wire activity timeline and audit events into UI.
3. Validate ingestion lifecycle: create, fail, retry, and error handling.
4. Implement or complete retrieval query UX and citation rendering.
5. Add API and integration tests for core workflows and ingestion paths.

## Evidence Required

- UI screenshots or test logs for core workflow paths.
- API tests for ingestion create/fail/retry flows.
- Retrieval query and citation output validation evidence.

## Risks

- Ingestion retry state drift between UI and API.
- Missing UI linkages to ingestion and activity timeline.

## Exit Criteria

- Core workflow and discovery gates complete.
- Ingestion and retrieval flows produce consistent results in tests.
