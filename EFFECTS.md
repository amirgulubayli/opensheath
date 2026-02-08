# EFFECTS — ClosedSheath (OpenClaw Task Core)

This repo’s **primary workflow** is the OpenClaw task pipeline (the endpoint behind the UI’s main “task” experience). That pipeline is implemented with **Effect TS**, making effects explicit and composable, and executing them via an Effect runtime at the edges.

---

## 1) I/O Boundary (Effect Inventory)

Everything the system can observe or do outside its pure core:

- **Network I/O**
  - WebSocket chat relay to OpenClaw gateway
  - OpenClaw tool invocation via middleware chain
- **Persistence**
  - Audit trail, invocation store, policies, gateway registry (services injected)
- **Time**
  - Durations, retry scheduling, subtask timeouts
- **Randomness**
  - Retry jitter (Effect schedule jitter)
- **Concurrency / Cancellation**
  - Parallel execution of subtasks with bounded fan-out
- **Logging / Telemetry**
  - Structured API logs and orchestration traces
- **Errors / Retries**
  - Explicit failure channels in Effect, exponential backoff on subtask failures

---

## 2) Effect Definitions (Code References)

### Effect Capabilities (Tags + Helpers)
- Effect tags and capability wiring: apps/api/src/effects/openclaw-effects.ts
  - `GatewayRegistryTag`
  - `MiddlewareChainTag`
  - `makeOpenClawLayer()`
  - `selectGatewayEffect`
  - `invokeToolEffect`
  - `runOpenClawEffect()`

### Effectful Orchestrator (Primary Control Flow)
- Effect-based orchestration runtime: apps/api/src/openclaw-orchestrator-effect.ts
  - `EffectfulOpenClawOrchestrator.execute()` (runs the effect program)
  - `buildPlan()` (pure planning + decomposition)
  - `runSubtask()` (explicit retries, time, concurrency)
  - `synthesize()` (LLM synthesis effect with fallback)

### Entry Points (Runtime at the edges)
- HTTP orchestration entrypoint: apps/api/src/openclaw-routes.ts
  - `/openclaw/task` uses the effectful orchestrator
  - `/openclaw/tools/invoke` uses `invokeToolEffect` via `runOpenClawEffect`
- Server wiring: apps/api/src/server.ts
  - `EffectfulOpenClawOrchestrator` is the injected runtime engine

---

## 3) Pure Core (Business Logic)

The deterministic “inside” is expressed as pure transformations:

- Prompt decomposition heuristics: apps/api/src/openclaw-task-decomposer.ts
  - `decomposeUserMessage()` returns a plan without side effects
- Plan construction and result shaping (pure mapping):
  - `buildPlan()` and `synthesize()` in apps/api/src/openclaw-orchestrator-effect.ts

**Information Flow (pure core):**

Inputs (user message)
→ decomposition (plan + subtasks)
→ effectful execution of subtasks
→ aggregation + synthesis
→ response payload

---

## 4) Runtime (Language + Effect System)

- **Language:** TypeScript (Node.js, ESM)
- **Effect Runtime:** Effect TS
- **Runtime style:**
  - Effects are built as values (e.g., `invokeToolEffect`, `runSubtask`),
  - Dependencies are provided via Effect layers and tags,
  - Execution is performed at the edges with `Effect.runPromise()`.

---

## 5) How to Run (Judge Checklist)

1. `npm ci`
2. `npm run -w @ethoxford/api dev`
3. (Optional) `npm run -w @ethoxford/web dev`

`OPENAI_API_KEY` enables LLM-powered decomposition and synthesis.

---

If you’re evaluating effectfulness: the OpenClaw task pipeline is the main user-facing workflow and it is implemented as an Effect program, with explicit, typed effects for the external world and a pure core for planning and aggregation.
