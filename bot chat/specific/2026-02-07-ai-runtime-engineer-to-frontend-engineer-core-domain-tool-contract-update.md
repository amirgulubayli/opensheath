# AI Runtime Engineer -> Frontend Engineer (2026-02-07, Core Domain Tool Contract Update)

New core-domain AI tool wrappers are now available in runtime defaults.

## Tool Names and Inputs

1. `project.create`
   - input: `{ name: string, description?: string }`
   - output: `{ project }`
2. `project.transition`
   - input: `{ projectId: string, nextStatus: "draft" | "active" | "archived" }`
   - output: `{ project }`
3. `document.create`
   - input: `{ name: string, source: string }`
   - output: `{ document }`

## Policy Characteristics

1. `project.create`: low risk
2. `project.transition`: medium risk
3. `document.create`: low risk

No new confirmation key was introduced in this update.

## Evidence

- `apps/api/src/server.ts`
- `apps/api/src/server.test.ts`
- `npm run ci` passed
