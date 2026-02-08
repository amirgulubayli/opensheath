# Ultimate Sprint Plan — OpenClaw Swarm + Middleware Integration

**Purpose:** Deliver the full OpenClaw‑backed swarm architecture and task‑management middleware as the app’s “beating heart.”

**Scope emphasis:** Every action/tool invocation must route through OpenClaw Gateway using `/tools/invoke` with strict policy layering, multi‑tenant isolation, auditability, and sub‑agent safety controls.

**Key OpenClaw behaviors baked in:**
- Tool availability is filtered by policy chain; blocked tools return **404**.
- Tool policy layers: `tools.profile`, `tools.allow/deny`, per‑agent `agents.list[].tools.*`, group policies, and subagent policy.
- Sub‑agents spawn via `sessions_spawn`; cross‑agent spawns require `allowAgents` allowlists.
- Sub‑agent tool defaults deny session tools by default.
- Sandbox, tool policy, and elevated are distinct; **deny always wins**.
- Tool groups (`group:*`) should be used to keep allowlists deterministic.

---

# Program Increments (12 sprints, 2 weeks each)

## Sprint 1 — Foundations & Contracts
**Goal:** Establish integration contracts and system boundaries.

### Epic E1: OpenClaw Invoke Contract
- Define a canonical invoke envelope: `tool`, `action`, `args`, `sessionKey`, auth header.
- Document the “404 = blocked tool” behavior and mandatory deny‑by‑default posture.
- Standardize correlation IDs and trace propagation rules.

### Epic E2: Middleware Layer Skeleton
- Define interfaces for: policy evaluation, tool catalog lookup, audit logging, and OpenClaw gateway routing.
- Decide tenancy scoping for middleware policy cache and configuration refresh.

### Epic E3: Swarm Architecture Blueprint
- Define agent roles: **Coordinator**, **Researcher**, **Executor**, **Reviewer**.
- Map each role to expected tool groups and sub‑agent privileges.
- Draft default sub‑agent constraints and maximum fan‑out strategy.

**Acceptance Criteria**
- A complete integration contract document exists (tool invoke payload + policy layering).
- Agent role map exists and is aligned to OpenClaw tooling constraints.

---

## Sprint 2 — Gateway Registry + Workspace Binding
**Goal:** Establish OpenClaw gateway inventory and workspace mapping.

### Epic E4: Gateway Registry
- Register OpenClaw gateways per environment/workspace.
- Health and liveness checks.
- Store auth mode and token references.

### Epic E5: Workspace Binding
- Map workspace → gateway + default sessionKey scheme.
- Support per‑workspace routing policies.

**Acceptance Criteria**
- Workspace requests resolve to a specific gateway and sessionKey path.
- Failure modes are deterministic and logged.

---

## Sprint 3 — Policy Compiler v1 + Tool Catalog
**Goal:** Build tool catalog and allowlist compiler for both middleware and OpenClaw.

### Epic E6: Tool Catalog Sync
- Ingest tool inventory from gateway (core + plugins).
- Maintain tool metadata (risk tier, approval requirements, allowed actions).

### Epic E7: Two‑Layer Allowlisting
- Middleware allowlist: workspace × role × tool × action.
- OpenClaw allowlist: `tools.allow/deny`, `agents.list[].tools.allow/deny`.
- Use `group:*` for compact policies.

**Acceptance Criteria**
- Same tool is blocked by both middleware and OpenClaw policy (404).
- Tool catalog drives policy compilation.

---

## Sprint 4 — Swarm Orchestration MVP
**Goal:** Enable sub‑agent execution through OpenClaw only.

### Epic E8: Sub‑Agent Spawn Path
- Orchestrator uses `sessions_spawn` for background work.
- Enforce per‑agent `allowAgents` allowlist.

### Epic E9: Sub‑Agent Tool Policy Defaults
- Use default sub‑agent deny list (session tools denied).
- Allow per‑role overrides via policy compiler.

**Acceptance Criteria**
- Cross‑agent sub‑spawn without allowlist is denied.
- Sub‑agents cannot call session tools unless explicitly allowed.

---

## Sprint 5 — Task Management Core
**Goal:** Define task graph, workflow states, and mapping to agent runs.

### Epic E10: Task Graph + State Machine
- States: `queued`, `running`, `blocked`, `completed`, `failed`.
- Map sub‑agent run IDs to task nodes.
- Establish retries and timeout strategies.

### Epic E11: Swarm Concurrency Controls
- Cap fan‑out per workspace.
- Map to OpenClaw sub‑agent lane concurrency.

**Acceptance Criteria**
- Task state progression is deterministic.
- Fan‑out caps are enforced consistently across runs.

---

## Sprint 6 — Execution Chain + Audit
**Goal:** Full “middle‑layer policy → OpenClaw invoke → audit trail” pipeline.

### Epic E12: End‑to‑End Invoke
- Orchestrator → middleware policy gate → OpenClaw `/tools/invoke`.
- Record the full decision, redacted args, and result summary.

### Epic E13: Review Gates
- Require approvals for risk tiers (Tier 2–3).
- Ensure blocked tools produce 404 and are logged.

**Acceptance Criteria**
- Every tool call has a decision log + audit entry.
- Risky tool calls cannot execute without explicit approval.

---

## Sprint 7 — Sandbox, Tool Policy, Elevated Controls
**Goal:** Align agent sandbox settings with tool policy restrictions.

### Epic E14: Sandbox Profiles
- Role‑based sandbox configurations.
- Separate “where tools run” from “which tools run.”

### Epic E15: Elevated Execution Controls
- Control `exec` with `tools.elevated.*` gates.
- Log all elevation attempts.

**Acceptance Criteria**
- Deny policies are still enforced even when sandbox is off.
- Elevation is auditable and requires explicit allowlist.

---

## Sprint 8 — Session Tools Governance
**Goal:** Restrict session tools and prevent prompt injection via cross‑agent comms.

### Epic E16: Session Tool Restrictions
- Limit `sessions_*` tools to coordinator agents.
- Enforce visibility rules (spawned‑only vs all).

### Epic E17: Safe A2A Messaging
- Use structured messaging envelopes.
- Strip tool‑output prompt injection patterns.

**Acceptance Criteria**
- Sub‑agents cannot list/attach to unrelated sessions.
- A2A messages are sanitized and policy‑safe.

---

## Sprint 9 — Policy Compiler v2 + Replay
**Goal:** Harden policy versioning and enable replay workflows.

### Epic E18: Policy Versioning
- Versioned policy releases and rollbacks.
- Diff and provenance tracking.

### Epic E19: Replay Framework
- Store invocation envelope and rerun metadata.
- Replays disabled by default; admin‑only enable.

**Acceptance Criteria**
- Policy changes are auditable and reversible.
- Replay is safe and gated.

---

## Sprint 10 — Observability & Governance
**Goal:** Make the system transparent and operationally safe.

### Epic E20: Tracing + Metrics
- Trace per tool call, agent run, and sub‑agent run.
- Rate‑limit / deny events visible in dashboards.

### Epic E21: Kill Switch
- Disable a gateway, tool, or skill across tenants instantly.

**Acceptance Criteria**
- Operators can see every decision and tool call.
- Kill switch instantly blocks execution across all workspaces.

---

## Sprint 11 — Supply‑Chain Governance
**Goal:** Prevent unreviewed tools/skills from entering the system.

### Epic E22: Skill Governance Workflow
- Only pinned / reviewed tools allowed.
- Tool catalog enforces review status.

### Epic E23: Quarantine + Revocation
- Quarantine suspicious tools and auto‑deny.

**Acceptance Criteria**
- New tools cannot execute without review.
- Revoked tools are blocked immediately.

---

## Sprint 12 — Demo Spine + Reliability
**Goal:** Deliver end‑to‑end demo with resilience.

### Epic E24: Full Demo Narrative
- Multi‑agent orchestration + task graph + OpenClaw gating.
- Explicit highlight of 404 on blocked tools and review gates.

### Epic E25: Reliability Hardening
- Retry policy, timeout strategy, and sub‑agent cancellation.

**Acceptance Criteria**
- Demo: orchestrator → sub‑agents → OpenClaw tool invoke → audit trace.
- Reliability paths validated (retry, timeout, stop).

---

# Risk Tiering (Default)
- **Tier 0:** read‑only tools (safe)
- **Tier 1:** internal writes within workspace
- **Tier 2:** external writes or network side effects
- **Tier 3:** shell/exec/elevated, credentialed actions

---

# Governance Principles
- Two‑layer allowlisting (middleware + OpenClaw policy).
- Tool policies are deterministic; deny always wins.
- Sub‑agents are least‑privileged and restricted by default.
- All actions are audited with trace identifiers.

---

# Deliverables Summary
- Gateway registry + workspace binding
- Tool catalog sync + risk tiers
- Policy compiler (middleware + OpenClaw configs)
- Swarm orchestration with sub‑agent safety rules
- Task management state machine
- End‑to‑end audit + observability
- Supply‑chain governance for tools/skills

---

# Definition of Done
- Every tool call flows through middleware → OpenClaw `/tools/invoke`.
- Blocked tools return 404 and are logged.
- Sub‑agents run with restricted tool surface by default.
- All risk‑tiered actions require approvals and are auditable.
