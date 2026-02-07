# AI Agent Delivery Protocol

## Objective

Ensure AI coding agents implement stories in coherent, dependency-safe order while preserving architecture and quality guarantees.

## Mandatory Execution Sequence Per Story

1. Read story ticket and dependency map.
2. Confirm required contracts and schema assumptions.
3. Implement data/contract layer first.
4. Implement service layer and business rules.
5. Implement API/UI integration.
6. Add tests and observability instrumentation.
7. Update documentation and handoff notes.

## Agent Guardrails

- Never bypass auth/authz or tenant-scoping checks.
- Never introduce untyped cross-module interfaces.
- Never ship AI tool actions without policy checks and audit logs.
- Never skip negative-path tests for security or billing features.

## PR Chunking Rules

- Preferred: one story per PR.
- Maximum: two tightly coupled stories if justified.
- Include explicit downstream integration impact section.

## Completion Evidence Requirements

- Acceptance criteria checklist result.
- Test evidence summary.
- Operational impact summary.
- Rollback note for risky changes.

