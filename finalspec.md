# spec.md — OpenClaw-Centric, Zero-Trust Agentic Middleware Platform (Hackathon MVP → Production)

**Document type:** end-to-end implementation blueprint (no code)
**Audience:** product owners, architects, engineering leads, AI coding agents
**Date:** February 6, 2026
**Planning horizon:** 24 weeks (12 × 2-week sprints)
**MVP scope override:** `docs/00-governance/demo-mvp-scope-overrides.md` (non-monetized hackathon scope)

---

## 0) Why this update exists

The prior plan described a generic “AI gateway + integrations.” For this hackathon, **OpenClaw is the beating pulse**:

* **All “tools/integrations” are routed through OpenClaw** (and its ecosystem services / skills / nodes) rather than bespoke per-provider connectors.
* **Your platform is the security + governance middleware** that makes OpenClaw safe and enterprise-presentable: tool allowlisting, review gates, auditability, tenancy isolation, usage limits, and deterministic orchestration.

This is non-optional because the OpenClaw ecosystem has already been targeted by malicious “skills” used to deliver malware, steal secrets, and social-engineer users into running hostile commands. ([The Verge][1])

---

## 1) North Star (OpenClaw-first)

Build a **multi-tenant, secure, AI-powered web platform** where users:

1. onboard into workspaces,
2. manage domain entities (projects/items/tasks/docs),
3. ingest knowledge (files → chunks → retrieval),
4. use an AI copilot to reason,
5. **execute actions only through OpenClaw-backed tools**, and
6. collaborate + observe everything via audit logs, metrics, and replay.

### 1.1 Product principles (with OpenClaw reality baked in)

* **Determinism first; AI augments.** Tool execution is policy-gated, validated, logged.
* **Tenant safe by design.** Workspace isolation in DB + **isolated OpenClaw execution contexts**.
* **Zero-trust tool plane.** Treat skills/plugins as untrusted until proven otherwise.
* **Observable by default.** Trace every agent run + every tool invocation end-to-end.

---

## 2) OpenClaw: what we rely on (integration-relevant facts)

### 2.1 The Gateway is your tool execution plane

OpenClaw Gateway exposes a single-tool HTTP invoke endpoint:

* `POST /tools/invoke`
* Same port as Gateway WS + HTTP multiplex
* Bearer token / password auth supported
* Includes `tool`, optional `action`, `args`, and optional `sessionKey`
* **Tool availability is filtered via policy chain** (`tools.allow`, provider allowlists, agent allowlists, group policies, subagent policy)
* If not allowlisted → **returns 404** ([OpenClaw][2])

### 2.2 Remote access posture (don’t expose it like a raw API)

OpenClaw docs strongly bias toward:

* Gateway binding to loopback (default port 18789),
* remote use via SSH tunneling or tailnet,
* Tailscale Serve/Funnel options with auth considerations. ([OpenClaw][3])

### 2.3 Multi-agent “swarm” primitives you can demo safely

OpenClaw provides:

* **Sub-agents**: background agent runs spawned from an agent run (`sessions_spawn`), with their own session key and tool policies (and defaults that *exclude session tools* unless configured). ([OpenClaw][4])
* **Per-agent sandbox + tool restrictions** in multi-agent setups (`tools.allow/deny`, per-agent tool profiles, sandbox config). ([OpenClaw][5])

### 2.4 Extension model warning: plugins/skills are code

OpenClaw’s extensibility is powerful, but it increases attack surface:

* Public “skills” marketplaces have already been abused at scale (malicious packages, prompt injection, credential exfiltration, malware droppers). ([The Verge][1])

This drives the core middleware requirement: **a robust review gate + allowlist enforcement + execution sandboxing**.

---

## 3) Target Architecture (updated)

### 3.1 Logical components (updated modules)

1. **`web-app`** — UI (Next.js), server actions, route handlers
2. **`domain-core`** — entities, invariants, use cases
3. **`data-access`** — repos, migrations, RLS policies
4. **`ai-orchestrator`** — prompt contracts, reasoning, structured outputs, run state machine
5. **`openclaw-control-plane`** — *your* middleware for OpenClaw:

   * gateway registry (per workspace / per environment)
   * tool catalog sync + classification
   * policy compilation (allowlists/denylists) → enforced at middleware + OpenClaw policy chain
   * pairing/credentials lifecycle
6. **`openclaw-execution-plane`** — OpenClaw Gateways + Nodes + Skills (self-hosted)
7. **`ingestion-pipeline`** — parse/chunk/embed/index
8. **`automation-engine`** — events → rules → actions (actions call OpenClaw tools)
9. **`observability-plane`** — traces/logs/alerts/audits

### 3.2 Core execution flow (the “beating pulse”)

1. User request (UI/chat) → `ai-orchestrator`
2. Orchestrator proposes action plan → **policy check in middleware**
3. Middleware selects OpenClaw gateway + sessionKey + tool policy profile
4. Middleware calls OpenClaw `POST /tools/invoke`
5. OpenClaw enforces its own tool allowlist policy chain → returns `200/400/401/404` ([OpenClaw][2])
6. Middleware records:

   * decision log (why allowed/denied)
   * full tool invocation envelope
   * result summary + evidence links (where applicable)
7. Orchestrator summarizes to user (with citations for knowledge answers)

**Non-negotiable:** no direct provider connectors in the app for MVP—**only OpenClaw-routed actions**.

---

## 4) OpenClaw Integration Design (deep)

### 4.1 Gateway topology (multi-tenant safe default)

**Baseline**: one of the following (choose per demo constraints, but keep the abstraction the same):

* **Per-workspace isolated gateway** (strongest isolation, easiest story: “each tenant has its own tool plane”)
* **Per-environment gateway pool** with strict sessionKey separation + policy profiles (higher risk; only acceptable if time-boxed)

**Security posture**: keep gateways loopback-bound; access via SSH/tailnet rather than exposing WAN ports. ([OpenClaw][3])

### 4.2 Tool invocation contract (what your middleware sends)

Your middleware wraps the OpenClaw invoke payload:

* Required: `tool`
* Optional: `action`
* Optional: `args`
* Optional: `sessionKey` (maps to workspace/agent context)
* Header: `Authorization: Bearer <token>` ([OpenClaw][2])

**Policy behavior to exploit intentionally:**

* If tool not allowlisted by OpenClaw policy chain → `404` ([OpenClaw][2])
  This is perfect for “deny-by-default” posture.

### 4.3 Tool catalog + classification (how you stay deterministic)

Maintain an internal “Tool Catalog” table keyed by:

* `tool_name`
* `gateway_id` (or provider grouping)
* `risk_tier` (read-only, write, network, credentialed, execution, elevated)
* `required_approvals` (none / user-confirm / admin / break-glass)
* `allowed_workspaces` / `allowed_roles`

Then compile into:

* **Middleware enforcement** (hard gate)
* **OpenClaw policy config profiles** (second hard gate) via allowlist chains (`tools.allow`, per-agent allowlists, etc.). ([OpenClaw][2])

### 4.4 Swarm agent demo design (safe fan-out)

Use OpenClaw sub-agents for parallel work (research, slow tools, multi-service workflows):

* Parent agent run spawns sub-agents (`sessions_spawn`)
* Sub-agents run in separate session keys and can have **restricted tool surfaces** by default ([OpenClaw][4])
* Configure per-agent sandbox + tool restrictions for “public-facing” or “risky” agents ([OpenClaw][5])

**Middleware requirement:** enforce a maximum fan-out per workspace + per run (cost + safety), and auto-stop/cleanup policies.

---

## 5) Security Middleware (the whole point)

OpenClaw’s ecosystem has active supply-chain and prompt-injection style threats (malicious skills, credential theft, and social-engineering payloads). ([The Verge][1])

### 5.1 Threat model (minimum set)

* **Malicious skill/package** (downloads and runs payload; steals secrets)
* **Indirect prompt injection** via retrieved content or tool output that tries to override instructions
* **Credential exfiltration** through tool arguments/outputs/logs
* **Lateral movement** via network-capable tools
* **Tenant boundary crossing** via mis-scoped sessionKey or gateway mapping

### 5.2 Controls (must-have)

#### A) Deny-by-default allowlisting (two layers)

1. Middleware allowlist (workspace × role × tool × action)
2. OpenClaw tool policy allowlist (so even if middleware is bypassed, tool is still blocked → 404) ([OpenClaw][2])

#### B) Review gate for risky actions

Risk tier examples:

* Tier 0: pure reads (safe)
* Tier 1: writes inside your app domain (moderate)
* Tier 2: external writes (high)
* Tier 3: execution / shell / elevated mode / credentialed automations (critical)

For Tier 2–3 require:

* explicit user confirmation with diff/preview (“what will happen”)
* optional admin approval (demo operator)
* full transcript + immutable audit record

#### C) Skill supply-chain policy (hackathon MVP but real)

* **No “install from marketplace” inside production path**
* Skills/plugins must be:

  * pinned to commit hash (or packaged internally)
  * reviewed (CODEOWNERS + checklist)
  * scanned (static + secret scan)
  * signed/attested (post-hackathon hardening)

This is justified by real incidents reported across ClawHub / OpenClaw skills. ([Tom's Hardware][6])

#### D) Network and secrets hygiene

* Keep gateway loopback-bound; remote via SSH/tailnet. ([OpenClaw][3])
* Use short-lived tokens where possible; rotate frequently.
* Redact secrets in logs (inputs *and* outputs).
* Store invocation envelopes encrypted at rest (or tokenize sensitive fields).

#### E) Observability + replay

Every tool call emits:

* trace/span id
* workspace_id, user_id, agent_run_id, sessionKey
* tool/action
* policy decision (allowed/denied + rule id)
* result hash + sanitized summary
* link to “replay” (re-run blocked by default; admin only)

---

## 6) Updated Feature Map (OpenClaw woven in)

You keep Features 1–8 from the master plan, but **Features 4 and 6 become OpenClaw-centric**, and you add Feature 9.

### Feature 4 (updated): AI Orchestrator + OpenClaw Action Plane

**Goal:** trustworthy AI assistance where *all* actions route through OpenClaw under policy control.

**Epics**

* **F4-E1** Prompt contracts + structured outputs (unchanged)
* **F4-E2** Action execution loop (updated):

  * tool selection results in **OpenClaw invoke request**, not direct connector calls
  * validation + authorization + review gates happen before invoke
* **F4-E3** Guardrails + evals (updated):

  * eval for “policy compliance” and “tool refusal correctness”
  * eval for injection resistance (“tool output tries to override policy”)

### Feature 6 (updated): Automation via OpenClaw Tools

**Goal:** event-driven automation where actions are OpenClaw tool invocations.

**Epics**

* **F6-E1** Integration hub becomes **OpenClaw gateway registry + health**
* **F6-E2** Rule engine emits `OpenClawInvokeRequested` events
* **F6-E3** Notifications unchanged

### Feature 9 (new): OpenClaw Fleet + Skill Governance

**Goal:** enterprise-credible OpenClaw usage.

**Epics**

* **F9-E1: Gateway Fleet Manager**

  * register gateways, assign to workspaces, monitor health
  * rotate auth tokens/passwords
* **F9-E2: Tool Catalog Sync**

  * ingest allowed tool list per gateway
  * classify risk tiers, map to policies
* **F9-E3: Policy Compiler**

  * generate middleware policy + OpenClaw allowlists
  * enforce “404 on not allowlisted” expectation ([OpenClaw][2])
* **F9-E4: Skill Supply-Chain Controls**

  * internal registry mirror + pinning + review workflow
  * quarantine + revocation
* **F9-E5: Swarm Safety Controls**

  * sub-agent fan-out caps + concurrency caps
  * per-agent sandbox/tool profiles ([OpenClaw][5])

---

## 7) Data Model Blueprint (updated tables)

Add these to the existing list:

* `openclaw_gateways` (id, env, host, auth_mode, token_ref, status)
* `openclaw_workspace_bindings` (workspace_id → gateway_id, default_sessionKey scheme)
* `openclaw_tool_catalog` (gateway_id, tool_name, risk_tier, allowed_actions, metadata)
* `openclaw_policy_rules` (workspace_id, role, tool, action, decision, rule_version)
* `openclaw_skill_packages` (name, source, pinned_ref, review_status, scanner_results)
* `openclaw_invocations` (agent_run_id, tool, args_redacted, decision, response_summary, traces)

Cross-cutting rules remain:

* every tenant record carries `workspace_id`
* audit everything privileged or AI-initiated

---

## 8) Sprint Plan (12 sprints) — where OpenClaw actually lands

You keep the overall cadence, but **bring OpenClaw earlier** so the demo spine exists before “nice to haves.”

### Sprint 2 (Week 5–6): Observability + Auth Start **+ First OpenClaw Gateway**

* Stand up 1 gateway in staging (loopback + SSH/tailnet posture)
* Implement middleware “Gateway Registry” minimal slice ([OpenClaw][3])

### Sprint 3 (Week 7–8): Tenant + Authorization **+ OpenClaw Workspace Binding**

* workspace → gateway binding
* sessionKey mapping scheme per workspace

### Sprint 6 (Week 13–14): AI Runtime v1 **→ OpenClaw Tool Invoke**

* implement the action execution loop that calls `POST /tools/invoke`
* enforce deny-by-default + audit logging ([OpenClaw][2])

### Sprint 7 (Week 15–16): Retrieval + Guardrails **+ Tool Policy Compiler v1**

* tool catalog + risk tiers
* generate allowlists (middleware + OpenClaw policy)

### Sprint 8 (Week 17–18): Automation **via OpenClaw**

* rule engine emits OpenClaw invocations
* idempotency + retries + replay

### Sprint 9 (Week 19–20): Swarm Demo (Sub-agents)

* integrate sub-agents into orchestrator demos
* caps + safety profiles ([OpenClaw][4])

### Sprint 10–11: Hardening

* skill governance workflow
* scanning + pinning
* incident runbooks and rapid revocation

---

## 9) Demo Narrative (what you show on stage)

**One UI. One orchestrator. Many capabilities. Zero trust.**

1. User asks: “Pull updates from Service A, correlate with docs, draft response, notify channel.”
2. Orchestrator:

   * uses retrieval for grounding,
   * spawns sub-agents for parallel steps,
   * proposes tool actions.
3. Middleware:

   * blocks anything not allowlisted,
   * forces review gate on risky steps,
   * logs everything,
   * then routes through OpenClaw tools.
4. The demo highlights:

   * **OpenClaw as the tool mesh**
   * **your layer as the safety + governance control plane**
   * observable traces + replay

---

## 10) OpenClaw Hardening Checklist (minimum viable “enterprise vibes”)

Grounded in real-world skill malware incidents and OpenClaw’s own remote access guidance: ([The Verge][1])

* [ ] Gateways loopback-bound; remote via SSH/tailnet (no public exposure by default)
* [ ] Two-layer allowlisting (middleware + OpenClaw policy)
* [ ] Tool risk tiers + mandatory approvals for high-risk tiers
* [ ] Skill install disabled by default; internal pinned packages only
* [ ] Secret redaction in logs and tool outputs
* [ ] Immutable audit logs for: policy changes, tool invocations, privilege changes
* [ ] Sub-agent fan-out caps + concurrency caps + restricted tool profiles
* [ ] “Kill switch” to revoke a gateway / tool / skill across all tenants instantly

---

## 11) Source notes (OpenClaw references used)

* OpenClaw Tools Invoke API (`POST /tools/invoke`, auth, policy chain, 404 behavior). ([OpenClaw][2])
* OpenClaw Remote Access + loopback guidance + SSH/tailnet posture. ([OpenClaw][3])
* OpenClaw Tailscale Serve/Funnel modes + auth behavior. ([OpenClaw][7])
* OpenClaw Sub-agents + policy model + concurrency notes. ([OpenClaw][4])
* OpenClaw Multi-agent sandbox + per-agent tool restrictions. ([OpenClaw][5])
* Security incident reporting on malicious OpenClaw skills/ClawHub ecosystem abuse (context for strict review gate). ([The Verge][1])

---

## 12) What you should implement first (to keep the build deterministic)

If you do nothing else, do these in order:

1. **OpenClaw Gateway Registry + Workspace Binding**
2. **Tool Catalog + Risk Tiering**
3. **Two-layer Allowlist Enforcement (middleware + OpenClaw policy)**
4. **Review Gate UX for risky tools**
5. **Audit + traces for every invoke**
6. **Sub-agent swarm demo with safety caps**

That sequence guarantees the demo “spine” exists early and everything else attaches cleanly.

[1]: https://www.theverge.com/news/874011/openclaw-ai-skill-clawhub-extensions-security-nightmare?utm_source=chatgpt.com "OpenClaw's AI 'skill' extensions are a security nightmare"
[2]: https://docs.openclaw.ai/gateway/tools-invoke-http-api "Tools Invoke API - OpenClaw"
[3]: https://docs.openclaw.ai/gateway/remote "Remote Access - OpenClaw"
[4]: https://docs.openclaw.ai/tools/subagents "Sub-Agents - OpenClaw"
[5]: https://docs.openclaw.ai/tools/multi-agent-sandbox-tools "Multi-Agent Sandbox & Tools - OpenClaw"
[6]: https://www.tomshardware.com/tech-industry/cyber-security/malicious-moltbot-skill-targets-crypto-users-on-clawhub?utm_source=chatgpt.com "Malicious OpenClaw 'skill' targets crypto users on ClawHub - 14 malicious skills were uploaded to ClawHub last month"
[7]: https://docs.openclaw.ai/gateway/tailscale "Tailscale - OpenClaw"
