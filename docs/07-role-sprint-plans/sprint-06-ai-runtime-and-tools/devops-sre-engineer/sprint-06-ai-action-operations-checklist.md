# Sprint 06 AI Action Operations Checklist (DevOps/SRE)

Sprint: 06 - AI runtime and tools v1  
Gate: AI action gate  
Story scope: `F4-E1-S1..S3`, `F4-E2-S1..S3`

## Week 1 Priorities

1. Enable AI run tracing with correlation across gateway, tools, and backend actions.
2. Add token/cost telemetry by model and workflow.
3. Define alert thresholds for tool failure spikes and policy-block anomalies.

## Week 2 Priorities

1. Validate timeout/retry controls for tool execution loops.
2. Validate model/provider health and failover visibility.
3. Publish AI action gate evidence packet.

## One-Day Task Plan

| Task ID | Story | Task | Evidence |
|---|---|---|---|
| S06-DV-01 | F4-E1-S1 | Add AI run trace field contract and validate propagation | trace sample links |
| S06-DV-02 | F4-E1-S3 | Add schema-mismatch and parse-failure telemetry alerts | alert test output |
| S06-DV-03 | F4-E2-S1/S2 | Instrument tool success/failure/timeouts per tool | tool dashboards |
| S06-DV-04 | F4-E2-S3 | Validate fallback and rollback trigger observability | rollback readiness notes |
| S06-DV-05 | Gate | Build day-9 AI action evidence packet | packet link set |

## Gate Evidence Required

1. AI run, tool-step trace samples with correlation IDs.
2. Token/cost telemetry and anomaly alert evidence.
3. Timeout/retry/failure handling telemetry.
4. Rollback trigger and runbook linkage proof.
