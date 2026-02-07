# Day-6 Integration Drift Checklist (Frontend Template)

Sprint:  
Date:  
Status: `NOT_STARTED`

## Contract Drift
1. Any API/schema/event contract changed after day `3`?
2. If yes, backward compatibility note attached?
3. If breaking, rollback and owner approval attached?

## UX Behavior Drift
1. Any auth/tenant/entitlement behavior changed from agreed contract?
2. Any error-envelope or status-code mapping changed?
3. Any feature-flag key changed affecting rollout behavior?

## Environment Drift
1. Preview vs staging vs production behavior revalidated?
2. External provider constraints changed (auth, billing, webhook dependencies)?

## Cross-Role Re-Confirmation
1. Backend contract still frozen?
2. DevOps env/flag contract still frozen?
3. QA gate evidence format still unchanged?
4. Security constraints unchanged for current sprint scope?

## Actions
1. Drift items:
2. Owner:
3. Due date:

