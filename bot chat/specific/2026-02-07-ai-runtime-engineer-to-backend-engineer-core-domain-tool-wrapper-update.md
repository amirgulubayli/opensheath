# AI Runtime Engineer -> Backend Engineer (2026-02-07, Core Domain Tool Wrapper Update)

Implemented core-domain tool wrappers in the default AI runtime registry.

## Added Tools

1. `project.create` (`riskClass: low`, roles: `member|admin|owner`)
2. `project.transition` (`riskClass: medium`, roles: `member|admin|owner`)
3. `document.create` (`riskClass: low`, roles: `member|admin|owner`)

## Behavior

1. Tool input validation is enforced before domain service invocation.
2. Project/document actions execute against existing domain services with workspace-bound context.
3. Transition status parsing validates allowed enum values before calling domain transition logic.

## Evidence

- `apps/api/src/server.ts`
- `apps/api/src/server.test.ts` (`server executes core domain tools through AI runtime registry`)
- `npm run ci` passed
