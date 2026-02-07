# Sprint 07 Retrieval and Citation Provenance Contract

Date: 2026-02-07
Owner: Data Platform Engineer
Consumers: AI Runtime, Backend, Frontend, QA/Release, Security/Compliance

## Scope

Supports `F5-E2-S2`, `F5-E2-S3`, `F5-E3-S1`, `F4-E3-S1`.

## Retrieval Result Contract (Per Item)

- `workspace_id`
- `document_id`
- `chunk_id`
- `source_uri`
- `source_title`
- `chunk_start_offset`
- `chunk_end_offset`
- `retrieval_score`
- `retrieval_rank`
- `retrieval_method` (`semantic`, `keyword`, `hybrid`)
- `embedding_model_version`
- `indexed_at`
- `correlation_id`

## Citation Provenance Contract (Per Citation)

- `citation_id`
- `agent_run_id`
- `response_segment_id`
- `document_id`
- `chunk_id`
- `evidence_type` (`direct`, `supporting`, `inferred`)
- `confidence_score`
- `confidence_band` (`high`, `medium`, `low`)
- `workspace_id`

## Tenant Isolation Rules

1. Retrieval query must include tenant scope from trusted context.
2. Results with mismatched `workspace_id` are discarded and logged as security anomaly.
3. Cross-tenant negative tests are mandatory for retrieval APIs.

## Quality and Safety Signals

1. Track retrieval miss rate and low-confidence citation rate.
2. Persist model version used for retrieval and answer generation.
3. Persist policy moderation outcome linkage when citations are suppressed.

## API/UI Expectations

1. Citation payload must be stable for frontend evidence rendering.
2. Response must include `confidence_band` for UI signaling.
3. Missing provenance fields should force fallback state and diagnostic logging.

## Gate Evidence

1. Retrieval latency and relevance sample evidence.
2. Cross-tenant leakage negative tests.
3. Citation payload completeness checks.
4. Confidence score distribution and anomaly alerts.
