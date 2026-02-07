# Sprint 03 Tenant Isolation Operations Checklist (DevOps/SRE)

Sprint: 03 - Tenant and authorization model  
Gate: Tenant isolation gate  
Story scope: `F2-E2-S1..S3`, `F2-E3-S1..S3`

## Week 1 Priorities

1. Add tenant-isolation telemetry dimensions to all relevant authz pathways.
2. Validate CI gate coverage for authorization regression suite execution and publish result to release dashboard.
3. Confirm alerting for cross-tenant access anomalies.

## Week 2 Priorities

1. Validate negative-path alert behavior for role-denied and cross-tenant attempts.
2. Confirm runbook linkage for tenant-isolation incidents.
3. Assemble tenant isolation gate evidence packet.

## One-Day Task Plan

| Task ID | Story | Task | Evidence |
|---|---|---|---|
| S03-DV-01 | F2-E3-S1 | Add role/permission decision telemetry signals | dashboard links |
| S03-DV-02 | F2-E3-S2 | Validate policy-check failure observability for tenant tables | policy telemetry sample |
| S03-DV-03 | F2-E3-S3 | Wire authz regression suite status into release gate view | CI gate link |
| S03-DV-04 | F2-E2-S1/S2/S3 | Capture workspace lifecycle anomaly alerts | alert simulation output |
| S03-DV-05 | Gate | Build day-9 tenant isolation evidence packet | packet link set |

## Gate Evidence Required

1. Cross-tenant negative tests and related telemetry.
2. Authz regression gate results with runtime evidence links:
   - `POST /release/authz-regression`
   - `GET /release/dashboard?gate=tenant_isolation`
3. Incident runbook references and ownership map.
4. Open risk list with mitigation owner/date.
