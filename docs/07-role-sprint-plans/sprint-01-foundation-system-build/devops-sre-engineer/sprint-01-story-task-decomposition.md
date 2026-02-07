# Sprint 01 Story Task Decomposition (DevOps/SRE)

Sprint: 01 - Foundation system build  
Gate: CI/CD gate  
Story scope: `F1-E1-S1`, `F1-E1-S2`, `F1-E1-S3`, `F1-E2-S1`, `F1-E2-S2`, `F1-E2-S3`

## Task Breakdown (One-Day Units)

| Task ID | Story | Task | Prerequisites | Reviewer | Evidence |
|---|---|---|---|---|---|
| S01-DV-01 | F1-E1-S1 | Define repo-level CI workflow skeleton and quality stage order (`lint -> typecheck -> test -> build`) | Sprint 00 architecture gate artifacts | Backend + Frontend | CI config PR and passing run |
| S01-DV-02 | F1-E1-S1 | Add branch protection rule checklist and merge-blocking policy docs | S01-DV-01 | QA/Release | documented policy and policy validation evidence |
| S01-DV-03 | F1-E1-S2 | Validate shared contract package build/test integration in CI pipeline | S01-DV-01 | Backend | contract consumer compile evidence |
| S01-DV-04 | F1-E1-S3 | Add architecture guardrail CI step for forbidden imports/cycles | S01-DV-01 | Backend + Architecture owner | failing negative test sample and green rerun |
| S01-DV-05 | F1-E2-S1 | Configure cache strategy and artifact retention policy for CI jobs | S01-DV-01 | DevOps/SRE | CI duration baseline and artifact references |
| S01-DV-06 | F1-E2-S2 | Publish environment variable contract (preview/staging/prod) and required ownership | Sprint 00 dependency responses | Security/Compliance + Frontend | env contract doc and reviewer sign-off |
| S01-DV-07 | F1-E2-S2 | Add startup validation checks for missing critical env vars (fail-fast behavior) | S01-DV-06 | Backend | startup failure simulation evidence |
| S01-DV-08 | F1-E2-S3 | Enable preview deployment workflow with PR linkage and status checks | S01-DV-01, S01-DV-06 | Frontend + QA/Release | preview deployment evidence for sample PR |
| S01-DV-09 | F1-E2-S3 | Create production promotion and rollback checklist for high-risk changes | S01-DV-08 | QA/Release + Security/Compliance | signed checklist and rollback drill notes |
| S01-DV-10 | F1-E2-S1/F1-E2-S3 | Build CI/CD gate evidence packet draft for day-9 handoff | S01-DV-02 through S01-DV-09 | QA/Release | gate packet with links to tests/logs/checklists |

## Dependency Notes

1. Security/Compliance must confirm secret ownership and rotation expectations before S01-DV-07 closure.
2. QA/Release must confirm gate packet format before S01-DV-10 finalization.
3. Backend and Frontend must confirm no contract-breaking pipeline assumptions after day 5 freeze.

## Day-9 Gate Handoff Output

1. CI run evidence across lint/typecheck/test/build.
2. Branch protection and architecture guardrail enforcement proof.
3. Preview deployment and rollback checklist evidence.
4. Open risk list with owner and mitigation date.
