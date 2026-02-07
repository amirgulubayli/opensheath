# Sprint 03 Migration Guard Specification

Date: 2026-02-07
Owner: Data Platform Engineer
Purpose: fail schema changes that introduce tenant tables without policy coverage.

## Guard Objective

Prevent merges where new tenant-owned tables are added without required tenant safety controls.

## Trigger Conditions

Run guard when migration diff includes:

1. `CREATE TABLE` statements.
2. `ALTER TABLE` adding tenant-relevant columns.
3. Policy-affecting table renames or splits.

## Guard Rules

1. If table is tenant-owned, migration must include `workspace_id NOT NULL`.
2. Table must declare RLS enabled and policy definitions before migration completion.
3. Required index presence check:
   - `(workspace_id, created_at)` or approved equivalent.
4. High-risk tables (`subscriptions`, `entitlements`, `usage_counters`, `agent_runs`, `tool_calls`) must include rollback note in PR metadata.

## Exemptions

1. Global reference tables explicitly marked non-tenant.
2. Temporary migration utility tables dropped in same migration and never exposed.

## CI Failure Output Requirements

Failure message must include:

1. table name,
2. missing control (`workspace_id`, RLS, policy, index, rollback note),
3. remediation steps,
4. affected sprint and story context if provided.

## Ownership and Escalation

1. Primary owner: Data Platform Engineer.
2. Mandatory reviewers for bypass requests: Security/Compliance + Backend.
3. Bypass allowed only with rollback note and explicit time-bounded follow-up task.
