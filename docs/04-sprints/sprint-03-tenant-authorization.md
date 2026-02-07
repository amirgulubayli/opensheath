# Sprint 03: Tenant and Authorization Model

## Sprint Goal

Ship workspace lifecycle and role-based access with strict tenant isolation.

## Epic Scope

- `F2-E2` Workspaces and memberships.
- `F2-E3` Authorization and data isolation.

## In-Sprint Stories

- `F2-E2-S1`, `F2-E2-S2`, `F2-E2-S3`
- `F2-E3-S1`, `F2-E3-S2`, `F2-E3-S3`

## Engineering Execution Plan

### Backend Lane

- Implement workspace and membership domain services.
- Define and enforce role matrix across service actions.
- Implement RLS policies for tenant-owned tables.

### Frontend Lane

- Build workspace creation/switch UI.
- Build invitation acceptance and member management interfaces.
- Add role-aware UI states and disabled/forbidden handling.

### Platform/Security Lane

- Add authorization test fixtures across roles/tenants.
- Add CI authz regression gate.
- Add audit logs for membership and permission changes.

### QA Lane

- E2E coverage for invite, role update, and removal flows.
- Negative tests for cross-tenant and insufficient-role access.

## Week-by-Week Plan

### Week 1

- Workspace/membership core models and APIs.
- Role matrix and authorization middleware updates.
- Initial RLS policies and test harness.

### Week 2

- Invite and membership lifecycle UX completion.
- Full policy test suite and negative authz scenarios.
- Gate evidence package for tenant isolation sign-off.

## Exit Criteria

- Workspace lifecycle works end-to-end.
- Authorization matrix enforced in service and policy layers.
- Tenant isolation regression suite fully green.

