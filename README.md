# ClosedSheath — Zero-Trust Governance Layer for the AI Tool Mesh

**The sheath that controls the claw.**

---

> In a world where AI agents wield tools with the power to read, write, execute, and connect — who watches the watchers?

**ClosedSheath** is a multi-tenant, security-first middleware platform that wraps OpenClaw's raw tool execution power in an impenetrable governance layer — turning autonomous AI agents from liability into enterprise-grade infrastructure.

OpenClaw gives agents claws. **ClosedSheath decides when they unsheathe.**

## What It Does

- **AI Copilot + Swarm Orchestration** — A reasoning engine that spawns sub-agents (Coordinator, Researcher, Executor, Reviewer), each sandboxed with least-privilege tool surfaces and fan-out caps.
- **Two-Layer Allowlisting** — Every tool invocation is policy-gated twice: first by ClosedSheath's middleware (workspace x role x tool x action), then by OpenClaw's own policy chain. Blocked tools return 404. Deny always wins.
- **Risk-Tiered Review Gates** — Read-only? Auto-approved. External writes? User confirmation with a diff preview. Shell execution? Admin break-glass with full transcript recording.
- **Knowledge Ingestion Pipeline** — Files to chunks to embeddings to retrieval-augmented generation, grounding every AI response in your workspace's actual data.
- **Observable by Default** — Every tool call, every policy decision, every sub-agent spawn emits structured traces with correlation IDs, workspace scoping, and replay capability.
- **Supply-Chain Governance** — Skills and plugins are treated as untrusted code. No marketplace installs in production. Pinned commits, code review, static scanning, and instant kill-switch revocation.

## Architecture

```
User --> Next.js Web App --> AI Orchestrator --> ClosedSheath Middleware --> OpenClaw Gateway
                                  |                      |                        |
                            Structured            Risk Tier Gate           /tools/invoke
                             Outputs              + Audit Log            + Policy Chain
                                  |                      |                        |
                            Sub-Agent              Decision Log            404 = Denied
                             Swarm                 + Trace ID             200 = Executed
```

A TypeScript monorepo powering domain-core, persistence, contracts, a Fastify API, and a Next.js frontend — all wired through typed contracts and dependency-ordered build pipelines.

## Why It Matters

The AI agent ecosystem is under active attack. Malicious skills on public marketplaces have already been weaponized for credential theft, malware delivery, and social engineering. ClosedSheath exists because the gap between "AI can do anything" and "AI should do this specific thing safely" is the most consequential engineering problem of our era.

OpenClaw is powerful. Power without governance is a weapon.
ClosedSheath is the governance.

## The Demo

"Pull updates from Service A, correlate with our docs, draft a response, and notify the team channel."

One natural-language request. The orchestrator grounds itself in your knowledge base, spawns parallel sub-agents, proposes tool actions, hits ClosedSheath's review gate for anything risky, routes through OpenClaw, and records every decision in an immutable trace — all visible in a single dashboard.

## How to Run

### Prereqs
- Node.js 20+
- npm 9+

### Install
1. `npm ci`

### Run the API
1. `npm run -w @ethoxford/api dev`

### Run the Web App (optional)
1. `npm run -w @ethoxford/web dev`

### Environment
- `.env` in the repo root is optional.
- `OPENAI_API_KEY` enables LLM-powered decomposition + synthesis in the task orchestrator.

## Effectful Architecture (Bounty)

This repo ships an effectful core for the OpenClaw task pipeline. See EFFECTS.md for the full effect inventory, effect definitions, and runtime wiring.

## Core Security Controls

- Two-layer allowlisting (middleware + OpenClaw policy chain)
- Risk-tiered approval gates (Tier 0 read-only through Tier 3 shell/elevated)
- Deny-by-default posture: blocked tools return 404
- Immutable audit logs for every tool invocation and policy decision
- Sub-agent fan-out caps and concurrency limits
- Skill supply-chain controls: pinned versions, review workflow, quarantine and revocation
- Gateway loopback binding with SSH/tailnet remote access
- Secret redaction in all logs and tool outputs
- Kill switch to revoke a gateway, tool, or skill across all tenants instantly

## Governance Principles

- Tool policies are deterministic; deny always wins.
- Sub-agents are least-privileged and restricted by default.
- All actions are audited with trace identifiers.
- No tool fires without authorization. No action escapes the trace log. No malicious skill slips past the quarantine.

---

Built for ETHOxford 2026. Designed for the world that comes after.

OpenClaw gives agents power. ClosedSheath gives you control.
Deny always wins.
