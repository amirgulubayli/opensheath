# AI Runtime Contract Foundation

## Purpose

Define the baseline contracts for AI runtime behavior so delivery is versioned, tenant-safe, and testable from Sprint 00 onward.

## Scope

- Prompt metadata contract.
- Model policy configuration contract.
- Structured output contract envelope.
- Validation and observability requirements.

## Contract A: Prompt Metadata

Use this metadata for every prompt template in registry.

```json
{
  "template_id": "assistant.answer.v1",
  "version": "1.0.0",
  "purpose": "general_assistant_response",
  "owner_role": "ai-runtime-engineer",
  "safety_profile": "default_tenant_safe",
  "allowed_tools": ["search_documents", "get_project_summary"],
  "input_contract_ref": "ai.contract.input.assistant.v1",
  "output_contract_ref": "ai.contract.output.assistant.v1",
  "fallback_template_id": "assistant.answer.safe_fallback.v1",
  "status": "active"
}
```

### Required Fields

1. `template_id`: globally unique within prompt registry.
2. `version`: semantic version for controlled rollout.
3. `purpose`: bounded intent used for routing and audits.
4. `owner_role`: accountable owner for updates and incidents.
5. `safety_profile`: policy bundle applied before generation.
6. `allowed_tools`: allowlist for tool invocation.
7. `input_contract_ref` and `output_contract_ref`: schema references.
8. `fallback_template_id`: safe fallback on policy or schema failure.
9. `status`: `draft | active | deprecated`.

## Contract B: Model Policy Configuration

Model routing and safety controls must be declarative and environment-aware.

```yaml
policy_id: ai.policy.default.v1
environment: production
default_model: gpt-5-mini
fallback_model: gpt-5-mini
routing:
  - use_case: assistant_answer
    model: gpt-5-mini
    temperature: 0.2
    max_output_tokens: 1200
  - use_case: high_risk_action_summary
    model: gpt-5-mini
    temperature: 0.0
    max_output_tokens: 600
safety:
  moderation_required: true
  tool_policy_mode: strict_allowlist
  block_on_schema_violation: true
  require_user_confirmation_for:
    - billing_change
    - external_webhook_mutation
observability:
  emit_trace: true
  emit_run_metrics: true
  emit_policy_decisions: true
rollback:
  enabled: true
  canary_percent: 5
```

### Policy Invariants

1. Production must always define both `default_model` and `fallback_model`.
2. High-risk actions require deterministic generation settings.
3. Tool policy is deny-by-default.
4. Schema validation failure must produce safe fallback output and structured error.

## Contract C: Structured Output Envelope

Every assistant response and tool step result should emit this envelope.

```json
{
  "contract_version": "1.0.0",
  "run_id": "run_123",
  "workspace_id": "ws_456",
  "request_id": "req_789",
  "result": {
    "status": "success",
    "assistant_message": "string",
    "tool_calls": [],
    "citations": [],
    "safety_flags": []
  },
  "errors": [],
  "meta": {
    "model": "gpt-5-mini",
    "prompt_template_id": "assistant.answer.v1",
    "prompt_version": "1.0.0",
    "latency_ms": 1200
  }
}
```

### Envelope Rules

1. `workspace_id` and `request_id` are mandatory for tenant-safe tracing.
2. `result.status` values: `success | partial | blocked | failed`.
3. `errors` uses typed codes (example: `SCHEMA_VALIDATION_FAILED`, `POLICY_BLOCKED`, `TOOL_AUTHZ_DENIED`).
4. `meta` must always include model and prompt identity.

## Validation and Gate Checks

### Definition of Ready Gate

1. Input and output contracts linked per story.
2. Safety profile assigned and reviewed.
3. Observability fields mapped to logging and trace standards.

### Definition of Done Gate

1. Contract validation tests pass.
2. Negative-path behavior validated (`blocked`, `failed`, tool denial).
3. Documentation and handoff contract updated.

## Ownership and Change Control

- Owner: AI Runtime Engineer.
- Reviewers: Backend, Security/Compliance, QA/Release.
- Change policy: major changes require version bump and migration note.
