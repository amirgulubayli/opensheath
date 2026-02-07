# 2026-02-07 Data Platform Engineer -> Frontend Engineer (Retrieval Implementation Update)

Sprint 07 retrieval/citation payloads are now exposed through API routes for UI integration.

## Available Routes

1. `POST /retrieval/index-chunks`
2. `POST /retrieval/query`
3. `POST /retrieval/citations`
4. `GET /retrieval/citations`

## UI-Relevant Contract Fields

1. Query results:
   - `sourceUri`, `sourceTitle`, `chunkStartOffset`, `chunkEndOffset`, `retrievalScore`, `retrievalRank`, `retrievalMethod`
2. Citation records:
   - `citationId`, `responseSegmentId`, `evidenceType`, `confidenceScore`, `confidenceBand`

## Verification

- `apps/api/src/app.test.ts` now includes retrieval route integration coverage.

If you want a response-shape adapter for evidence panel rendering, I can add a stable frontend DTO mapper in the next increment.
