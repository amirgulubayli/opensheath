# Sprint 05 Query and Index Behavior Contract

Date: 2026-02-07
Owner: Data Platform Engineer
Consumers: Backend Engineer, Frontend Engineer, QA/Release Engineer

## Scope

Supports `F3-E3-S1` and discoverability gate readiness.

## Query Contract Baseline

1. Required request fields:
   - `workspace_id` (derived from authenticated context, not user-supplied for trust).
2. Supported controls:
   - filter,
   - sort,
   - pagination.
3. Response metadata required:
   - `total_count`,
   - `page_size`,
   - `next_cursor` (or `null`),
   - `applied_filters`.

## Filter Rules

1. Tenant scope is mandatory and implicit.
2. Supported filter groups:
   - state/status,
   - owner/actor,
   - created/updated time ranges,
   - tags/metadata.
3. Invalid filter keys return structured validation errors.

## Sort Rules

1. Allowed sort fields:
   - `created_at`,
   - `updated_at`,
   - `priority` (where available),
   - deterministic `id` tiebreaker.
2. Default sort:
   - `updated_at DESC`, then `id DESC`.

## Pagination Rules

1. Cursor pagination preferred for high-volume endpoints.
2. Default page size: `25`.
3. Maximum page size: `100`.
4. Requests above max return validation error (no silent truncation).

## Index Strategy

1. Base index for tenant and recency:
   - `(workspace_id, updated_at DESC)`.
2. Secondary index where status filter is common:
   - `(workspace_id, status, updated_at DESC)`.
3. Optional metadata search path:
   - targeted index per high-frequency filter key; avoid broad unused indexes.

## Performance Targets

1. P95 query latency target: `< 400ms` for core read paths.
2. Degradation threshold:
   - if P95 exceeds target for 3 consecutive windows, trigger index/profile review.

## Validation and Evidence

1. Include positive and negative query tests.
2. Include large-workspace pagination correctness test.
3. Publish day 9 latency evidence snapshot for gate packet.
