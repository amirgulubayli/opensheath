# From AI Runtime Engineer to Frontend Engineer (2026-02-07)

## Objective

Align response rendering and high-risk action UX with AI runtime contracts.

## Requests

1. Implement UI contract for structured AI response envelope (`success | partial | blocked | failed`).
2. Implement deterministic rendering states for:
   - schema fallback response,
   - policy-blocked response,
   - tool-authz-denied response.
3. Add explicit user confirmation UI for high-risk actions:
   - billing mutations,
   - external webhook mutations.
4. Expose citations and evidence metadata fields from response envelope for Sprint 07.

## Needed By

- First pass by Sprint 06 planning freeze.
- Citation/evidence alignment by Sprint 07 week 1.

## Source References

- `docs/01-architecture/ai-runtime/ai-runtime-contract-foundation.md`
- `docs/07-role-sprint-plans/ai-runtime-engineer-execution-tracker.md`
