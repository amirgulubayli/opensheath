# Sprint 05 Discoverability and Ingestion Operations Checklist (DevOps/SRE)

Sprint: 05 - Search and ingestion v1  
Gate: Discoverability gate  
Story scope: `F3-E3-S1..S3`, `F5-E1-S1..S3`

## Week 1 Priorities

1. Establish queue/retry/dead-letter controls for ingestion jobs.
2. Define alert thresholds for ingestion failure spikes and queue depth growth.
3. Instrument search query latency and error trends.

## Week 2 Priorities

1. Validate dead-letter recovery and replay workflows.
2. Tune query reliability alerts to reduce noise while preserving sensitivity.
3. Publish discoverability gate evidence packet.

## One-Day Task Plan

| Task ID | Story | Task | Evidence |
|---|---|---|---|
| S05-DV-01 | F5-E1-S3 | Configure retry/backoff and dead-letter operational controls | queue policy docs |
| S05-DV-02 | F5-E1-S1/S2 | Instrument ingestion pipeline health signals | ingestion dashboards |
| S05-DV-03 | F3-E3-S1 | Add search API latency/error alerting | search metrics links |
| S05-DV-04 | F5-E1-S3 | Validate replay and recovery operations | replay drill output |
| S05-DV-05 | Gate | Build day-9 discoverability evidence packet | packet link set |

## Gate Evidence Required

1. Ingestion reliability and queue health metrics.
2. Dead-letter and replay validation evidence.
3. Search latency/error budget evidence.
4. Updated risks and mitigations.
