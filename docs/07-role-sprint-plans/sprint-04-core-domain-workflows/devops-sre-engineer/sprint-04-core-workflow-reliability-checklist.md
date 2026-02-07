# Sprint 04 Core Workflow Reliability Checklist (DevOps/SRE)

Sprint: 04 - Core domain workflows v1  
Gate: Core workflow gate  
Story scope: `F3-E1-S1..S3`, `F3-E2-S1..S3`

## Week 1 Priorities

1. Baseline service and worker runtime settings for core workflow load.
2. Define latency and error-budget alert thresholds for core write/read paths.
3. Confirm migration-impact monitoring and rollback trigger signals.

## Week 2 Priorities

1. Tune autoscaling and rate limits based on observed traffic profile.
2. Validate reliability of activity/timeline event pathways.
3. Publish core workflow gate evidence packet.

## One-Day Task Plan

| Task ID | Story | Task | Evidence |
|---|---|---|---|
| S04-DV-01 | F3-E1-S1 | Set baseline runtime and queue settings for core domain services | config and baseline metrics |
| S04-DV-02 | F3-E1-S3 | Add migration monitoring checkpoints and rollback trigger conditions | migration ops checklist |
| S04-DV-03 | F3-E2-S1/S2 | Instrument CRUD request latency and failure rates | dashboard links |
| S04-DV-04 | F3-E2-S3 | Validate activity pipeline health and alert routing | alert test outputs |
| S04-DV-05 | Gate | Build day-9 core workflow evidence packet | packet link set |

## Gate Evidence Required

1. Core workflow latency/error dashboard snapshots.
2. Autoscaling and rate-limit tuning notes.
3. Migration and rollback readiness proof.
4. Open risk register updates.
