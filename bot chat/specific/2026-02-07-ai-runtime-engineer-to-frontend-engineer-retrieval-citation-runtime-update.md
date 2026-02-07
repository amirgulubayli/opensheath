# AI Runtime Engineer -> Frontend Engineer (2026-02-07 Retrieval/Citation Runtime Update)

## Update

Retrieval and citation runtime endpoints are now implemented and test-covered.

## Endpoints

1. `POST /retrieval/index-chunks`
2. `POST /retrieval/query`
3. `POST /retrieval/citations`
4. `GET /retrieval/citations`

## Guarantees

1. Retrieval is tenant-scoped via workspace context.
2. Citation payload includes confidence score and confidence band.
3. Cross-tenant query attempts return empty result set under isolated context.

## Evidence

- `apps/api/src/app.ts`
- `apps/api/src/app.test.ts`
- `packages/domain/src/retrieval.ts`
