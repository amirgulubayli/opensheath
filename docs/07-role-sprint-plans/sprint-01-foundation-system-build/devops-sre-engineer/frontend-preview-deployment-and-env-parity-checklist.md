# Sprint 01 Frontend Preview Deployment and Environment Parity Checklist

Sprint: 01  
Owner: DevOps/SRE Engineer  
Consumer: Frontend Engineer

## Purpose

Provide the concrete preview verification and preview-vs-staging parity checks required to close the Sprint 01 CI/CD gate for `apps/web`.

## 1. Preview Deployment Verification Checklist (`apps/web`)

1. CI gate is green on the same commit:
   - `lint`
   - `validate:env`
   - `typecheck`
   - `test`
   - `build`
2. Preview deployment URL is published in PR evidence.
3. Preview smoke checks pass:
   - `/` renders app shell without runtime errors.
   - `/sign-in` route is reachable.
   - protected route (`/dashboard`) redirects as expected when unauthenticated.
4. API reachability check from preview succeeds (health endpoint returns `200`).
5. No missing-environment startup errors in preview logs.
6. Rollback pointer is recorded (last known good preview/staging build reference).

## 2. Environment Parity Notes (Preview vs Staging)

Use the same frontend parsing contract in both environments:
- `APP_ENV`: one of `local | preview | staging | production`
- `ENABLE_AI_FEATURES`: `true | false`
- `ENABLE_BILLING`: `true | false`

Parity rules:
1. Do not ship with undeclared or malformed values; parser must fail on invalid booleans.
2. If feature toggles differ between preview and staging, document the delta in gate evidence with reason and owner.
3. Auth shell behavior must remain contract-consistent across preview and staging:
   - unauthenticated protected-route redirect path,
   - sign-in success redirect path,
   - session-denied fallback path.

## 3. Day-9 CI/CD Gate Evidence Required

1. Preview deployment URL and timestamp.
2. Matching CI run URL proving green checks for the same commit SHA.
3. Smoke-check evidence for:
   - `/`
   - `/sign-in`
   - `/dashboard` redirect behavior
4. Frontend environment snapshot for preview and staging (`APP_ENV`, `ENABLE_AI_FEATURES`, `ENABLE_BILLING`) with any intentional diffs.
5. Rollback reference and owner acknowledgment.
6. Known risk list with mitigation owner and due date (if any).
