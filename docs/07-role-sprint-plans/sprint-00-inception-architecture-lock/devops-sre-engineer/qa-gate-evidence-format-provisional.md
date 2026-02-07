# Provisional QA/Release Gate Evidence Format (Fallback)

Date: 2026-02-07  
Source fallback: `docs/05-engineering-playbooks/pr-quality-gates.md` and `docs/05-engineering-playbooks/testing-strategy.md`

## Use Condition

Apply only if QA/Release response is delayed beyond Sprint 00 closure window.

## Required Sections

1. Story and scope coverage:
   - story IDs,
   - PR links,
   - in-scope/out-of-scope.
2. Acceptance criteria mapping:
   - AC item -> evidence link.
3. Test evidence:
   - unit/integration/e2e/regression results as applicable.
4. Observability evidence:
   - logs, traces, metrics, alerts for changed critical paths.
5. Security and rollback evidence:
   - security impact notes,
   - rollback trigger and procedure references.
6. Risk and dependency status:
   - open items, owners, due dates.
7. Sign-off section:
   - DevOps/SRE, QA/Release, Security/Compliance (when required).

## Replacement Rule

Replace this provisional format with QA/Release-provided template once received.
