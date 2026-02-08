"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import Link from "next/link";
import type {
  MetricsSummary,
  GatewayRecord,
  InvokeEnvelope,
  KillSwitchRecord,
  SwarmRun,
  ConnectionsOverview,
} from "../../src/lib/openclaw-client";
import {
  getMetrics,
  listGateways,
  listInvocations,
  listKillSwitches,
  listSwarmRuns,
  invokeTool,
  executeTask,
  getConnections,
} from "../../src/lib/openclaw-client";

/* â”€â”€â”€ Types â”€â”€â”€ */

interface ChatMessage {
  id: string;
  role: "user" | "system";
  content: string;
  timestamp: number;
  meta?: {
    tool?: string;
    status?: string;
    durationMs?: number;
    policyDecision?: string;
    riskTier?: number;
  };
}

type ViewMode = "chat" | "monitor";

interface SidebarData {
  metrics: MetricsSummary | null;
  gateways: GatewayRecord[];
  invocations: InvokeEnvelope[];
  killSwitches: KillSwitchRecord[];
  swarms: SwarmRun[];
  connections: ConnectionsOverview | null;
}

const DEMO_PROMPT = "research optimax software and prepare and setup a meeting with him today at 10pm.";
const normalizePrompt = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
const DEMO_PROMPT_NORM = normalizePrompt(DEMO_PROMPT);

/* â”€â”€â”€ Page â”€â”€â”€ */

export default function OpenClawPage() {
  const [view, setView] = useState<ViewMode>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "system",
      content:
        "Hey! I'm your ClosedSheath relay. Everything goes straight to OpenClaw â€” complex requests are auto-decomposed into concurrent sub-tasks.\n\nâ€¢ Just ask naturally â€” relayed to OpenClaw\nâ€¢ **gateways** â€” gateway status\nâ€¢ **metrics** â€” system stats\nâ€¢ **swarms** â€” swarm progress",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebar, setSidebar] = useState<SidebarData>({
    metrics: null,
    gateways: [],
    invocations: [],
    killSwitches: [],
    swarms: [],
    connections: null,
  });
  const chatEnd = useRef<HTMLDivElement>(null);
  const [demoStage, setDemoStage] = useState<number | null>(null);
  const [demoActive, setDemoActive] = useState(false);
  const demoTimers = useRef<number[]>([]);

  /* poll sidebar data */
  useEffect(() => {
    const load = async () => {
      try {
        const [m, g, i, k, s, c] = await Promise.all([
          getMetrics(),
          listGateways(),
          listInvocations(),
          listKillSwitches(),
          listSwarmRuns(),
          getConnections(),
        ]);
        setSidebar({
          metrics: m ?? null,
          gateways: g?.gateways ?? [],
          invocations: (i?.invocations ?? []).slice(0, 20),
          killSwitches:
            k?.killSwitches?.filter((x: KillSwitchRecord) => x.active) ?? [],
          swarms: s?.runs ?? [],
          connections: c ?? null,
        });
      } catch {
        /* sidebar can fail silently */
      }
    };
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      demoTimers.current.forEach((id) => clearTimeout(id));
      demoTimers.current = [];
    };
  }, []);

  const clearDemoTimers = () => {
    demoTimers.current.forEach((id) => clearTimeout(id));
    demoTimers.current = [];
  };

  const queueDemo = (delay: number, fn: () => void) => {
    const id = window.setTimeout(fn, delay);
    demoTimers.current.push(id);
  };

  const startDemoSequence = () => {
    clearDemoTimers();
    setDemoActive(true);
    setDemoStage(0);

    setMessages((p) => [
      ...p,
      sys("🧠 **Swarm initialized** — breaking request into parallel research, scheduling, and outreach tasks."),
    ]);

    queueDemo(600, () => {
      setDemoStage(1);
      setMessages((p) => [
        ...p,
        {
          ...sys("🔀 **Swarm dispatch** — 4 agents spun up, fan-out 3. Research, calendar, and comms are live."),
          meta: { status: "running", durationMs: 418, policyDecision: "allow", riskTier: 1 },
        },
      ]);
    });

    queueDemo(1050, () => {
      setMessages((p) => [
        ...p,
        {
          ...sys("📡 **Request stream** — payloads fanning out across Google Workspace, Trello, and Twitter connectors."),
          meta: { status: "running", durationMs: 612, policyDecision: "allow", riskTier: 1 },
        },
      ]);
    });

    queueDemo(1400, () => {
      setDemoStage(2);
      setMessages((p) => [
        ...p,
        {
          ...sys("🛡️ **Security middleware** — policy checks queued (PII, calendar scope, external outreach)."),
          meta: { status: "pending", policyDecision: "allow", riskTier: 1, durationMs: 902 },
        },
      ]);
    });

    queueDemo(2100, () => {
      setMessages((p) => [
        ...p,
        {
          ...sys("🔐 **Guardrails applied** — risk scoring, scope validation, and approval routing in progress."),
          meta: { status: "pending", policyDecision: "allow", riskTier: 1, durationMs: 1120 },
        },
      ]);
    });

    queueDemo(2500, () => {
      setDemoStage(3);
      setMessages((p) => [
        ...p,
        {
          ...sys("✅ **Policy approved** — checks passed, execution authorized."),
          meta: { status: "completed", policyDecision: "allow", riskTier: 1, durationMs: 1204 },
        },
      ]);
    });

    queueDemo(3800, () => {
      setDemoStage(4);
      setMessages((p) => [
        ...p,
        sys(
          "**Ready doc**\n\n```\nOptiMax Software — Rapid Brief & Meeting Prep\n\nSummary\n• Company: OptiMax Software (B2B optimization & analytics)\n• Focus: process automation, KPI forecasting, workflow modernization\n\nMeeting\n• Time: Today, 10:00 PM\n• Attendees: You + OptiMax Software (primary contact)\n• Agenda: Overview → pain points → demo → next steps\n\nDraft Email\nSubject: Quick sync tonight at 10:00 PM\n\nHi OptiMax team,\n\nConfirming our meeting today at 10:00 PM. I’ll share a short agenda and we can cover objectives, demo flow, and next steps.\n\nBest,\n[Your Name]\n```",
        ),
      ]);
      setSending(false);
    });
  };

  /* â”€â”€â”€ intent parser â”€â”€â”€ */

  const parseAndExecute = async (text: string): Promise<ChatMessage> => {
    const lo = text.toLowerCase().trim();

    if (lo.includes("gateway") || lo.includes("online")) {
      const r = await listGateways();
      const gws = r?.gateways ?? [];
      if (gws.length === 0) return sys("No gateways registered yet. Head to âš¡ Gateways to add one.");
      const lines = gws.map(
        (g) =>
          `â€¢ **${g.host}:${g.port}** â€” ${g.environment} â€” ${emoji(g.status)} ${g.status}`,
      );
      return sys(`**${gws.length} gateway${gws.length > 1 ? "s" : ""}:**\n\n${lines.join("\n")}`);
    }

    if (lo.includes("invocation") || lo.includes("history") || lo.includes("recent")) {
      const r = await listInvocations();
      const inv = (r?.invocations ?? []).slice(0, 6);
      if (inv.length === 0) return sys("No invocations yet â€” try invoking a tool!");
      const lines = inv.map(
        (v) =>
          `â€¢ \`${v.request.tool}\` â†’ ${emoji(v.status)} ${v.status} (${v.durationMs ?? "?"}ms, policy: ${v.policyDecision})`,
      );
      return sys(`**Recent invocations:**\n\n${lines.join("\n")}`);
    }

    if (lo.includes("metric") || lo.includes("stats") || lo.includes("dashboard")) {
      const m = await getMetrics();
      if (!m) return sys("Couldn't load metrics â€” is the API running?");
      return sys(
        `ðŸ“Š **Metrics:**\n\nâ€¢ Invocations: **${m.totalInvocations}**\nâ€¢ Allowed: **${m.allowedInvocations}** âœ…\nâ€¢ Denied: **${m.deniedInvocations}** âŒ\nâ€¢ Avg latency: **${m.avgDurationMs}ms**\nâ€¢ Active swarms: **${m.activeSwarmRuns}**`,
      );
    }

    if (lo.includes("kill") || lo.includes("emergency") || lo.includes("safe")) {
      const r = await listKillSwitches();
      const active = (r?.killSwitches ?? []).filter((k: KillSwitchRecord) => k.active);
      if (active.length === 0)
        return sys("âœ… **All clear.** No kill switches active.");
      const lines = active.map(
        (k: KillSwitchRecord) =>
          `â€¢ ðŸ›‘ **${k.scope}** â†’ \`${k.targetId}\` â€” ${k.reason}`,
      );
      return sys(`âš ï¸ **${active.length} kill switch${active.length > 1 ? "es" : ""} active:**\n\n${lines.join("\n")}`);
    }

    if (lo.includes("swarm") || lo.includes("task") || lo.includes("agent")) {
      const r = await listSwarmRuns();
      const runs = r?.runs ?? [];
      if (runs.length === 0) return sys("No swarm runs yet. Create one in ðŸ Swarm.");
      const lines = runs.slice(0, 5).map(
        (run) =>
          `â€¢ **${run.swarmRunId.slice(0, 12)}â€¦** â€” ${emoji(run.status)} ${run.status} â€” ${run.completedTasks}/${run.totalTasks} tasks`,
      );
      return sys(`**${runs.length} swarm run${runs.length > 1 ? "s" : ""}:**\n\n${lines.join("\n")}`);
    }

    if (lo.includes("help") || lo === "?") {
      return sys(
        "Here's what I can do:\n\nâ€¢ **tool name** â†’ invokes through middleware\nâ€¢ **gateways** â†’ gateway status\nâ€¢ **invocations** â†’ history\nâ€¢ **metrics** â†’ system stats\nâ€¢ **kill switch** â†’ safety status\nâ€¢ **swarms** â†’ swarm progress",
      );
    }

    /* explicit tool invocation: run/invoke/call <tool_name> */
    const explicitMatch = lo.match(/^(?:run|invoke|call|execute|use)\s+([a-z_]\w*)/);
    if (explicitMatch) {
      const tool = explicitMatch[1]!;
      const res = await invokeTool({ tool });
      if (!res)
        return sys(`âŒ Failed to invoke \`${tool}\`. Check the gateway is online.`);

      const inv = res.invocation;
      const summary = inv.responseSummary
        ? `\n\n**Response:**\n\`\`\`\n${inv.responseSummary.slice(0, 800)}\n\`\`\``
        : "";
      return {
        ...sys(
          `${emoji(inv.status)} **${inv.request.tool}** â†’ ${inv.status} in ${inv.durationMs ?? "?"}ms\n\nPolicy: ${inv.policyDecision} Â· Risk: T${inv.riskTier} Â· HTTP ${inv.httpStatus ?? "â€”"}${summary}`,
        ),
        meta: {
          tool: inv.request.tool,
          status: inv.status,
          durationMs: inv.durationMs ?? 0,
          policyDecision: inv.policyDecision,
          riskTier: inv.riskTier,
        },
      };
    }

    /* default â†’ relay to OpenClaw via task decomposer */
    const taskResult = await executeTask(text);
    if (!taskResult || !taskResult.reply) {
      return sys(`âŒ No response from the agent. Is the gateway online?`);
    }
    const stratLabel = taskResult.strategy === "decomposed"
      ? `ðŸ”€ ${taskResult.subtasks.length} subtasks`
      : "â†’ direct relay";
    const subtaskInfo = taskResult.strategy === "decomposed"
      ? "\n" + taskResult.subtasks.map((s: { label: string; status: string; durationMs?: number }, i: number) =>
          `${s.status === "completed" ? "âœ…" : "âŒ"} _${s.label}_ (${s.durationMs ?? "?"}ms)`
        ).join("\n")
      : "";
    return sys(`${taskResult.reply}\n\n_${stratLabel} Â· â± ${taskResult.totalDurationMs}ms_${subtaskInfo}`);
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    const isDemo = normalizePrompt(text) === DEMO_PROMPT_NORM;
    if (!isDemo && demoActive) {
      clearDemoTimers();
      setDemoActive(false);
      setDemoStage(null);
    }

    setMessages((p) => [
      ...p,
      { id: `u_${Date.now()}`, role: "user", content: text, timestamp: Date.now() },
    ]);
    setInput("");
    setSending(true);

    if (isDemo) {
      setView("chat");
      startDemoSequence();
      return;
    }

    try {
      const reply = await parseAndExecute(text);
      setMessages((p) => [...p, reply]);
    } catch {
      setMessages((p) => [
        ...p,
        sys("Something went wrong. Is the API server running on :4040?"),
      ]);
    }
    setSending(false);
  };

  /* â”€â”€â”€ Render â”€â”€â”€ */

  return (
    <div style={shell}>
      <style>{DEMO_CSS}</style>
      {/* main column */}
      <div style={mainCol}>
        {/* top bar */}
        <header style={topBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.svg" alt="ClosedSheath" style={{ width: 24, height: 24 }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>OpenClaw</span>
            <GatewayPill gws={sidebar.gateways} />
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <Toggle on={view === "chat"} onClick={() => setView("chat")}>
              ðŸ’¬ Chat
            </Toggle>
            <Toggle on={view === "monitor"} onClick={() => setView("monitor")}>
              ðŸ“Š Monitor
            </Toggle>
            <NavIcon href="/openclaw/gateways">âš¡</NavIcon>
            <NavIcon href="/openclaw/tools">ðŸ› </NavIcon>
            <NavIcon href="/openclaw/policy">ðŸ“‹</NavIcon>
            <NavIcon href="/openclaw/swarm">ðŸ</NavIcon>
            <NavIcon href="/openclaw/killswitch">ðŸ›‘</NavIcon>
            <NavIcon href="/openclaw/audit">ðŸ“œ</NavIcon>
          </div>
        </header>

        {view === "chat" ? (
          <>
            {/* messages */}
            <div style={chatArea}>
              {demoStage !== null && <DemoOrchestration stage={demoStage} />}
              {messages.map((m) => (
                <Bubble key={m.id} msg={m} />
              ))}
              {sending && (
                <div style={{ ...bBase, ...bSys, opacity: 0.6 }}>
                  <span style={dots}>
                    <span style={dot} />
                    <span style={{ ...dot, animationDelay: "0.2s" }} />
                    <span style={{ ...dot, animationDelay: "0.4s" }} />
                  </span>
                </div>
              )}
              <div ref={chatEnd} />
            </div>

            {/* input */}
            <form onSubmit={handleSend} style={inputBar}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask ClosedSheath anythingâ€¦ try 'list_sessions' or 'gateways'"
                style={chatInput}
                disabled={sending}
                autoFocus
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                style={sendBtn}
              >
                â†‘
              </button>
            </form>
          </>
        ) : (
          <MonitorView data={sidebar} />
        )}
      </div>

      {/* right sidebar */}
      <Sidebar data={sidebar} />
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â• Components â•â•â•â•â•â•â•â•â•â•â• */

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 6,
      }}
    >
      <div
        style={{ ...bBase, ...(isUser ? bUser : bSys), maxWidth: "75%" }}
      >
        {!isUser && msg.meta && (
          <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
            <Pill v={msg.meta.status === "completed" ? "ok" : "err"}>{msg.meta.status}</Pill>
            {msg.meta.policyDecision && (
              <Pill v={msg.meta.policyDecision === "allow" ? "ok" : "err"}>{msg.meta.policyDecision}</Pill>
            )}
            {msg.meta.durationMs != null && <Pill v="n">{msg.meta.durationMs}ms</Pill>}
            {msg.meta.riskTier != null && (
              <Pill v={msg.meta.riskTier >= 2 ? "err" : "ok"}>T{msg.meta.riskTier}</Pill>
            )}
          </div>
        )}
        <div
          style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}
          dangerouslySetInnerHTML={{ __html: md(msg.content) }}
        />
      </div>
    </div>
  );
}

function GatewayPill({ gws }: { gws: GatewayRecord[] }) {
  const ok = gws.filter((g) => g.status === "online" || g.status === "degraded").length;
  if (gws.length === 0)
    return (
      <span style={{ ...pill, background: "rgba(250,204,21,0.12)", color: "#facc15" }}>
        no gateways
      </span>
    );
  const all = ok === gws.length;
  return (
    <span
      style={{
        ...pill,
        background: all ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
        color: all ? "#4ade80" : "#f87171",
      }}
    >
      {ok}/{gws.length} online
    </span>
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        fontSize: 12,
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        fontWeight: 600,
        background: on ? "rgba(96,165,250,0.18)" : "transparent",
        color: on ? "#60a5fa" : "#6b7280",
      }}
    >
      {children}
    </button>
  );
}

function NavIcon({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.04)",
        textDecoration: "none",
        fontSize: 14,
      }}
    >
      {children}
    </Link>
  );
}

function Pill({ v, children }: { v: "ok" | "err" | "n"; children: React.ReactNode }) {
  const c = v === "ok" ? "#4ade80" : v === "err" ? "#f87171" : "#9aa2b6";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 7px",
        borderRadius: 999,
        background: `${c}18`,
        color: c,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

/* â”€â”€â”€ Monitor view â”€â”€â”€ */

function MonitorView({ data }: { data: SidebarData }) {
  const m = data.metrics;
  const connections = data.connections;
  const gatewayOnline = connections?.status.gatewaysOnline
    ?? data.gateways.filter((g) => g.status === "online" || g.status === "degraded").length;
  const gatewayTotal = connections?.status.gatewaysTotal ?? data.gateways.length;
  const policyRules = connections?.policyRules ?? 0;
  const toolCount = connections?.toolCatalog?.length ?? 0;
  const bindingsCount = connections?.bindings?.length ?? 0;
  const runningSwarms = data.swarms.filter((s) => s.status === "running").length;
  const denied = m?.deniedInvocations ?? 0;
  const failed = m?.failedInvocations ?? 0;
  const pendingApprovals = m?.pendingApprovals ?? 0;
  const allowed = m?.allowedInvocations ?? 0;
  return (
    <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
      {m && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>
          <KPI label="Invocations" value={m.totalInvocations} />
          <KPI label="Allowed" value={m.allowedInvocations} color="#4ade80" />
          <KPI label="Denied" value={m.deniedInvocations} color="#f87171" />
          <KPI label="Avg Latency" value={`${m.avgDurationMs}ms`} />
          <KPI label="Swarms" value={m.activeSwarmRuns} color="#60a5fa" />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 18 }}>
        <ProcessPipeline
          gatewayOnline={gatewayOnline}
          gatewayTotal={gatewayTotal}
          bindings={bindingsCount}
          toolCount={toolCount}
          policyRules={policyRules}
          runningSwarms={runningSwarms}
          invocations={data.invocations.length}
        />
        <SecurityPanel
          killSwitches={data.killSwitches.length}
          policyRules={policyRules}
          denied={denied}
          failed={failed}
          pendingApprovals={pendingApprovals}
          allowed={allowed}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16, marginBottom: 18 }}>
        <SwarmTopology runs={data.swarms} />
        <RiskMix byRisk={m?.byRiskTier ?? {}} />
      </div>

      {data.killSwitches.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.2)",
          }}
        >
          <div style={{ fontWeight: 700, color: "#f87171", marginBottom: 6 }}>
            ðŸ›‘ Active Kill Switches
          </div>
          {data.killSwitches.map((k) => (
            <div key={k.switchId} style={{ fontSize: 13, color: "#fca5a5", marginBottom: 2 }}>
              <strong>{k.scope}</strong> â†’ {k.targetId} â€” {k.reason}
            </div>
          ))}
        </div>
      )}

      <div style={{ fontWeight: 600, fontSize: 14, color: "#d3d8e6", marginBottom: 8 }}>
        Live Activity
      </div>
      {data.invocations.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "#6b7280", fontSize: 14 }}>
          No activity yet. Invoke a tool to get started.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {data.invocations.map((inv) => (
            <InvRow key={inv.invocationId} inv={inv} />
          ))}
        </div>
      )}

      {data.swarms.length > 0 && (
        <>
          <div
            style={{
              marginTop: 20,
              fontWeight: 600,
              fontSize: 14,
              color: "#d3d8e6",
              marginBottom: 8,
            }}
          >
            Swarm Runs
          </div>
          {data.swarms.map((run) => (
            <SwarmCard key={run.swarmRunId} run={run} />
          ))}
        </>
      )}
    </div>
  );
}

function ProcessPipeline({
  gatewayOnline,
  gatewayTotal,
  bindings,
  toolCount,
  policyRules,
  runningSwarms,
  invocations,
}: {
  gatewayOnline: number;
  gatewayTotal: number;
  bindings: number;
  toolCount: number;
  policyRules: number;
  runningSwarms: number;
  invocations: number;
}) {
  const steps = [
    {
      label: "Gateways",
      value: `${gatewayOnline}/${gatewayTotal}`,
      status: gatewayOnline > 0 ? "ok" : "err",
    },
    {
      label: "Bindings",
      value: bindings,
      status: bindings > 0 ? "ok" : "warn",
    },
    {
      label: "Catalog",
      value: toolCount,
      status: toolCount > 0 ? "ok" : "warn",
    },
    {
      label: "Policy",
      value: policyRules,
      status: policyRules > 0 ? "ok" : "warn",
    },
    {
      label: "Orchestration",
      value: runningSwarms,
      status: runningSwarms > 0 ? "ok" : "n",
    },
    {
      label: "Invocations",
      value: invocations,
      status: invocations > 0 ? "ok" : "n",
    },
  ];

  return (
    <div style={card}>
      <div style={cardTitle}>End-to-End Process</div>
      <div style={pipelineWrap}>
        {steps.map((step, idx) => (
          <div key={step.label} style={pipelineStep}>
            <StatusDot status={step.status} />
            <div style={{ fontSize: 12, color: "#9aa2b6" }}>{step.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{step.value}</div>
            {idx < steps.length - 1 && <div style={pipelineConnector} />}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
        Live pipeline metrics from gateways, bindings, policy, and orchestration.
      </div>
    </div>
  );
}

function SecurityPanel({
  killSwitches,
  policyRules,
  denied,
  failed,
  pendingApprovals,
  allowed,
}: {
  killSwitches: number;
  policyRules: number;
  denied: number;
  failed: number;
  pendingApprovals: number;
  allowed: number;
}) {
  return (
    <div style={card}>
      <div style={cardTitle}>Security Checks</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <MiniStat label="Policy Rules" value={policyRules} tone="ok" />
        <MiniStat label="Kill Switches" value={killSwitches} tone={killSwitches > 0 ? "err" : "ok"} />
        <MiniStat label="Denied" value={denied} tone={denied > 0 ? "err" : "n"} />
        <MiniStat label="Pending" value={pendingApprovals} tone={pendingApprovals > 0 ? "warn" : "n"} />
        <MiniStat label="Failed" value={failed} tone={failed > 0 ? "err" : "n"} />
        <MiniStat label="Allowed" value={allowed} tone="ok" />
      </div>
    </div>
  );
}

function RiskMix({ byRisk }: { byRisk: Record<string, { count: number; denied: number }> }) {
  const tiers = Object.entries(byRisk)
    .map(([tier, info]) => ({ tier, count: info.count }))
    .sort((a, b) => Number(a.tier) - Number(b.tier));
  const total = tiers.reduce((sum, t) => sum + t.count, 0);
  return (
    <div style={card}>
      <div style={cardTitle}>Risk Mix</div>
      {total === 0 ? (
        <div style={{ fontSize: 12, color: "#6b7280" }}>No risk-tier data yet.</div>
      ) : (
        <>
          <div style={riskBar}>
            {tiers.map((t) => (
              <div
                key={t.tier}
                style={{
                  height: "100%",
                  width: `${Math.max(4, (t.count / total) * 100)}%`,
                  background: riskColor(t.tier),
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {tiers.map((t) => (
              <span key={t.tier} style={riskPill}>
                T{t.tier} Â· {t.count}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SwarmTopology({ runs }: { runs: SwarmRun[] }) {
  if (runs.length === 0) {
    return (
      <div style={card}>
        <div style={cardTitle}>Multi-Agent Orchestration</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          No swarm runs yet. Start a swarm to visualize orchestration.
        </div>
      </div>
    );
  }
  return (
    <div style={card}>
      <div style={cardTitle}>Multi-Agent Orchestration</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {runs.slice(0, 3).map((run) => {
          const roleCounts = run.tasks.reduce<Record<string, number>>((acc, task) => {
            acc[task.agentRole] = (acc[task.agentRole] ?? 0) + 1;
            return acc;
          }, {});
          return (
            <div key={run.swarmRunId} style={{
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(15,17,22,0.6)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "monospace", fontSize: 12 }}>{run.swarmRunId.slice(0, 12)}â€¦</span>
                <Pill v={run.status === "completed" ? "ok" : run.status === "running" ? "n" : "err"}>
                  {run.status}
                </Pill>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {Object.entries(roleCounts).length === 0 ? (
                  <span style={{ fontSize: 11, color: "#6b7280" }}>No tasks recorded.</span>
                ) : (
                  Object.entries(roleCounts).map(([role, count]) => (
                    <span key={role} style={agentChip}>
                      {role} Â· {count}
                    </span>
                  ))
                )}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
                {run.completedTasks}/{run.totalTasks} tasks Â· fan-out {run.currentFanOut}/{run.maxFanOut}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DemoOrchestration({ stage }: { stage: number }) {
  const agents = [
    { name: "Coordinator", role: "Swarm lead", status: stage >= 4 ? "completed" : stage >= 1 ? "running" : "pending" },
    { name: "Research", role: "Intel scout", status: stage >= 3 ? "completed" : stage >= 1 ? "running" : "pending" },
    { name: "Scheduler", role: "Calendar", status: stage >= 4 ? "completed" : stage >= 2 ? "running" : "pending" },
    { name: "Outreach", role: "Comms", status: stage >= 4 ? "completed" : stage >= 2 ? "running" : "pending" },
    { name: "Security", role: "Policy", status: stage >= 3 ? "completed" : stage >= 2 ? "running" : "pending" },
  ];

  const flows = [
    { label: "Research Optimax", status: stage >= 3 ? "pass" : stage >= 1 ? "pending" : "pending" },
    { label: "Calendar availability", status: stage >= 3 ? "pass" : stage >= 2 ? "pending" : "pending" },
    { label: "Outreach draft", status: stage >= 3 ? "pass" : stage >= 2 ? "pending" : "pending" },
  ];

  const requests = [
    { label: "OptiMax intel sweep", route: "Search + brief", status: stage >= 3 ? "approved" : stage >= 2 ? "review" : "queued" },
    { label: "Calendar slot 10:00 PM", route: "Google Workspace", status: stage >= 3 ? "approved" : stage >= 2 ? "review" : "queued" },
    { label: "Outreach draft", route: "Gmail + Trello", status: stage >= 3 ? "approved" : stage >= 2 ? "review" : "queued" },
  ];

  const checks = [
    { label: "PII redaction", status: stage >= 3 ? "pass" : stage >= 2 ? "pending" : "pending" },
    { label: "Calendar scope", status: stage >= 3 ? "pass" : stage >= 2 ? "pending" : "pending" },
    { label: "External outreach", status: stage >= 3 ? "pass" : stage >= 2 ? "pending" : "pending" },
  ];

  const progressPct = stage >= 4 ? 100 : stage >= 3 ? 78 : stage >= 2 ? 46 : 18;
  const docStatus = stage >= 4 ? "Ready" : stage >= 3 ? "Drafting" : "Queued";

  return (
    <div className="demo-panel card" data-stage={stage}>
      <div className="demo-header">
        <div>
          <div className="demo-title">Swarm Demo — Optimax meeting request</div>
          <div className="demo-subtitle">Live swarm + security middleware visualization</div>
        </div>
        <div className="demo-badge">LIVE DEMO</div>
      </div>

      <div className="demo-grid">
        <div className="demo-card">
          <div className="demo-card-title">🐝 Swarm View</div>
          <div className="demo-swarm-graph">
            <span className="swarm-node core" />
            <span className="swarm-node n1" />
            <span className="swarm-node n2" />
            <span className="swarm-node n3" />
            <span className="swarm-node n4" />
            <span className="swarm-ring" />
            <span className="swarm-pulse" />
          </div>
          <div className="demo-agent-grid">
            {agents.map((agent) => (
              <div key={agent.name} className="demo-agent">
                <span className={`agent-dot ${agent.status}`} />
                <div>
                  <div className="demo-agent-name">{agent.name}</div>
                  <div className="demo-agent-role">{agent.role}</div>
                </div>
                <span className={`demo-agent-status ${agent.status}`}>{agent.status}</span>
              </div>
            ))}
          </div>
          <div className="demo-flow">
            {flows.map((flow) => (
              <div key={flow.label} className="demo-flow-item">
                <span className={`sec-chip ${flow.status}`}>{flow.status === "pass" ? "APPROVED" : "QUEUED"}</span>
                <span className="demo-flow-label">{flow.label}</span>
              </div>
            ))}
          </div>
          <div className="demo-requests">
            {requests.map((req, idx) => (
              <div key={req.label} className={`demo-request ${req.status}`}>
                <span className="demo-request-dot" style={{ animationDelay: `${idx * 0.3}s` }} />
                <div>
                  <div className="demo-request-title">{req.label}</div>
                  <div className="demo-request-route">{req.route}</div>
                </div>
                <span className={`demo-request-status ${req.status}`}>{req.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="demo-card">
          <div className="demo-card-title">🛡️ Security Middleware</div>
          <div className="demo-sec-stream">
            <div className="demo-sec-lane">
              <span className="sec-stream-dot" />
              <span className="sec-stream-dot d2" />
              <span className="sec-stream-dot d3" />
            </div>
            <div className="demo-sec-lane">
              <span className="sec-stream-dot d4" />
              <span className="sec-stream-dot d5" />
              <span className="sec-stream-dot d6" />
            </div>
          </div>
          <div className="demo-checks">
            {checks.map((check) => (
              <div key={check.label} className={`sec-full-check ${check.status}`}>
                <span className="sec-full-icon">{check.status === "pass" ? "✓" : "…"}</span>
                <span className="sec-full-label">{check.label}</span>
              </div>
            ))}
          </div>
          <div className="demo-approval">
            {stage >= 3 ? (
              <span className="sec-full-check pass">All checks approved</span>
            ) : (
              <span className="sec-full-check pending">Approvals in progress</span>
            )}
          </div>
          <div className="demo-progress">
            <div className="demo-progress-bar" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="demo-approval-footer">
            <span className={`approval-chip ${stage >= 3 ? "ok" : "wait"}`}>
              {stage >= 3 ? "Approved" : "Awaiting"}
            </span>
            <span className="approval-note">Policy engine · Scope verifier · Risk tier T1</span>
          </div>
        </div>

        <div className="demo-card">
          <div className="demo-card-title">📄 Delivery</div>
          <div className="demo-doc-status">
            <span className={`demo-doc-pill ${docStatus.toLowerCase()}`}>{docStatus}</span>
            <span className="demo-doc-time">ETA: 3–4s</span>
          </div>
          <div className="demo-doc-stack">
            <div className="demo-doc-sheet" />
            <div className="demo-doc-sheet" />
            <div className="demo-doc-sheet" />
          </div>
          <div className="demo-doc-preview">
            <div className="demo-doc-line wide" />
            <div className="demo-doc-line" />
            <div className="demo-doc-line" />
            <div className="demo-doc-line wide" />
          </div>
          <div className="demo-doc-footnote">Auto-generated brief + meeting setup draft</div>
          <div className="demo-doc-action">
            <button className="demo-doc-btn" type="button" disabled={stage < 4}>Ready Doc</button>
            <span className="demo-doc-status-note">{stage >= 4 ? "Generated" : "Compiling"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: "ok" | "warn" | "err" | "n" }) {
  const c = status === "ok"
    ? "#4ade80"
    : status === "warn"
      ? "#facc15"
      : status === "err"
        ? "#f87171"
        : "#60a5fa";
  return <span style={{ ...statusDot, background: c }} />;
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "err" | "n";
}) {
  const color = tone === "ok"
    ? "#4ade80"
    : tone === "warn"
      ? "#facc15"
      : tone === "err"
        ? "#f87171"
        : "#9aa2b6";
  return (
    <div style={{
      padding: "8px",
      borderRadius: 10,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.04)",
    }}>
      <div style={{ fontSize: 11, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function InvRow({ inv }: { inv: InvokeEnvelope }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 10,
        background: "rgba(17,19,26,0.6)",
      }}
    >
      <Dot s={inv.status} />
      <span style={{ fontFamily: "monospace", fontSize: 13, flex: 1 }}>
        {inv.request.tool}
      </span>
      <Pill v={inv.policyDecision === "allow" ? "ok" : "err"}>
        {inv.policyDecision}
      </Pill>
      <span style={{ color: "#6b7280", fontSize: 12 }}>{inv.durationMs ?? "?"}ms</span>
      <span style={{ color: "#4b5563", fontSize: 11 }}>{rel(inv.startedAt)}</span>
    </div>
  );
}

function SwarmCard({ run }: { run: SwarmRun }) {
  const pct = run.totalTasks
    ? Math.round(((run.completedTasks + run.failedTasks) / run.totalTasks) * 100)
    : 0;
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        background: "rgba(17,19,26,0.6)",
        marginBottom: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span style={{ fontFamily: "monospace", fontSize: 13 }}>
          {run.swarmRunId.slice(0, 16)}â€¦
        </span>
        <Pill
          v={
            run.status === "completed"
              ? "ok"
              : run.status === "running"
                ? "n"
                : "err"
          }
        >
          {run.status}
        </Pill>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 2,
            background: run.failedTasks ? "#f87171" : "#4ade80",
            transition: "width 0.3s",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
          fontSize: 11,
          color: "#6b7280",
        }}
      >
        <span>
          {run.completedTasks}/{run.totalTasks} tasks
        </span>
        <span>
          fan-out: {run.currentFanOut}/{run.maxFanOut}
        </span>
      </div>
    </div>
  );
}

/* â”€â”€â”€ Right sidebar â”€â”€â”€ */

function Sidebar({ data }: { data: SidebarData }) {
  return (
    <aside style={sidebarBox}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>System Health</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "12px 14px" }}>
        <MiniKPI label="Gateways" value={data.gateways.length} icon="âš¡" />
        <MiniKPI
          label="Active KS"
          value={data.killSwitches.length}
          icon="ðŸ›‘"
          alert={data.killSwitches.length > 0}
        />
        <MiniKPI label="Invocations" value={data.invocations.length} icon="â–¶" />
        <MiniKPI
          label="Swarms"
          value={data.swarms.filter((s) => s.status === "running").length}
          icon="ðŸ"
        />
      </div>

      {/* gateways */}
      <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={sectionHead}>Gateways</div>
        {data.gateways.length === 0 ? (
          <div style={{ fontSize: 12, color: "#4b5563" }}>None registered</div>
        ) : (
          data.gateways.map((g) => (
            <div
              key={g.gatewayId}
              style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}
            >
              <Dot s={g.status} />
              <span style={{ fontSize: 12, fontFamily: "monospace" }}>
                {g.host}:{g.port}
              </span>
            </div>
          ))
        )}
      </div>

      {/* recent invocations */}
      <div
        style={{
          padding: "8px 14px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          flex: 1,
          overflow: "auto",
        }}
      >
        <div style={sectionHead}>Recent</div>
        {data.invocations.slice(0, 8).map((inv) => (
          <div
            key={inv.invocationId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
              fontSize: 12,
            }}
          >
            <Dot s={inv.status} />
            <span
              style={{
                fontFamily: "monospace",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {inv.request.tool}
            </span>
            <span style={{ color: "#4b5563" }}>{inv.durationMs ?? "?"}ms</span>
          </div>
        ))}
      </div>

      {/* connections overview */}
      {data.connections && (
        <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={sectionHead}>Connections</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: data.connections.status.healthy ? "#4ade80" : "#f87171",
            }} />
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              {data.connections.status.gatewaysOnline}/{data.connections.status.gatewaysTotal} gateways Â· {data.connections.bindings.length} binding{data.connections.bindings.length !== 1 ? "s" : ""}
            </span>
          </div>
          {data.connections.discoveredCapabilities?.capabilities &&
            data.connections.discoveredCapabilities.capabilities.filter((cap) => cap.category === "integration").length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {data.connections.discoveredCapabilities.capabilities
                  .filter((cap) => cap.category === "integration")
                  .map((cap) => (
                    <span
                      key={cap.name}
                      style={{
                        fontSize: 10,
                        padding: "2px 7px",
                        borderRadius: 6,
                        background: "rgba(250,204,21,0.12)",
                        color: "#facc15",
                      }}
                    >
                      {cap.name}
                    </span>
                  ))}
              </div>
            )}
        </div>
      )}

      {/* quick links */}
      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <SBLink href="/openclaw/gateways">âš¡ Gateways</SBLink>
        <SBLink href="/openclaw/tools">ðŸ›  Tools</SBLink>
        <SBLink href="/openclaw/policy">ðŸ“‹ Policy</SBLink>
        <SBLink href="/openclaw/audit">ðŸ“œ Audit</SBLink>
        <SBLink href="/integrations">ðŸ”— Integrations</SBLink>
      </div>
    </aside>
  );
}

function MiniKPI({
  label,
  value,
  icon,
  alert,
}: {
  label: string;
  value: number;
  icon: string;
  alert?: boolean;
}) {
  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        background: alert ? "rgba(248,113,113,0.08)" : "rgba(255,255,255,0.03)",
        border: alert
          ? "1px solid rgba(248,113,113,0.2)"
          : "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: alert ? "#f87171" : "#f5f6f8",
          }}
        >
          {value}
        </span>
      </div>
      <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SBLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        padding: "4px 10px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.04)",
        fontSize: 11,
        color: "#9aa2b6",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </Link>
  );
}

function KPI({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "12px 8px",
        borderRadius: 12,
        background: "rgba(17,19,26,0.6)",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: color ?? "#f5f6f8",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Dot({ s }: { s: string }) {
  const c =
    s === "healthy" || s === "completed"
      ? "#4ade80"
      : s === "degraded" || s === "pending"
        ? "#facc15"
        : s === "failed" || s === "offline"
          ? "#f87171"
          : "#60a5fa";
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: c,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

/* â”€â”€â”€ Helpers â”€â”€â”€ */

function sys(content: string): ChatMessage {
  return {
    id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    role: "system",
    content,
    timestamp: Date.now(),
  };
}

function emoji(s: string) {
  if (s === "healthy" || s === "completed") return "âœ…";
  if (s === "degraded" || s === "pending") return "â³";
  if (s === "failed" || s === "offline") return "âŒ";
  return "ðŸ”µ";
}

function rel(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60_000) return "now";
  if (d < 3600_000) return `${Math.floor(d / 60_000)}m`;
  if (d < 86400_000) return `${Math.floor(d / 3600_000)}h`;
  return new Date(iso).toLocaleDateString();
}

function md(text: string) {
  return text
    .replace(
      /```([\s\S]*?)```/g,
      '<pre style="background:rgba(0,0,0,0.3);padding:10px;border-radius:8px;font-size:12px;overflow-x:auto;margin:6px 0">$1</pre>',
    )
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /`([^`]+)`/g,
      '<code style="background:rgba(96,165,250,0.12);padding:1px 5px;border-radius:4px;font-size:12px">$1</code>',
    )
    .replace(/\n/g, "<br />");
}

function riskColor(tier: string) {
  switch (tier) {
    case "0":
      return "#4ade80";
    case "1":
      return "#60a5fa";
    case "2":
      return "#facc15";
    default:
      return "#f87171";
  }
}

const DEMO_CSS = `
@keyframes blink { 0%,80%,100%{opacity:0} 40%{opacity:1} }
@keyframes pulse-glow { 0%,100%{box-shadow:0 0 0 0 rgba(96,165,250,0.4)} 50%{box-shadow:0 0 0 6px rgba(96,165,250,0)} }
@keyframes slide-in { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
@keyframes progress-pulse { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }

.demo-panel{margin-bottom:16px;padding:18px 18px 16px;border:1px solid rgba(96,165,250,0.2);background:linear-gradient(180deg,rgba(96,165,250,0.08),rgba(17,19,26,0.8));box-shadow:0 0 24px rgba(15,23,42,0.35)}
.card{border-radius:14px;background:rgba(17,19,26,0.6);border:1px solid rgba(255,255,255,0.06)}
.demo-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.demo-title{font-size:15px;font-weight:700;color:#e2e8f0}
.demo-subtitle{font-size:11px;color:#94a3b8;margin-top:2px}
.demo-badge{padding:4px 10px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:1px;background:rgba(96,165,250,0.2);color:#93bbfc}
.demo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.demo-card{padding:14px;border-radius:12px;background:rgba(15,17,22,0.65);border:1px solid rgba(255,255,255,0.04);animation:slide-in 0.25s ease-out}
.demo-card-title{font-size:12px;font-weight:700;margin-bottom:10px;color:#cbd5f5}
.demo-agent-grid{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}
.demo-agent{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.04)}
.demo-agent-name{font-size:12px;font-weight:600;color:#e2e8f0}
.demo-agent-role{font-size:10px;color:#64748b}
.demo-agent-status{margin-left:auto;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em}
.demo-agent-status.running{color:#93bbfc}
.demo-agent-status.completed{color:#4ade80}
.demo-agent-status.pending{color:#94a3b8}
.demo-agent-status.failed{color:#f87171}
.demo-flow{display:flex;flex-direction:column;gap:6px}
.demo-flow-item{display:flex;align-items:center;gap:8px;font-size:11px;color:#cbd5f5}
.demo-flow-label{flex:1}
.demo-checks{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}
.demo-approval{margin-bottom:10px}
.demo-progress{height:6px;border-radius:999px;background:rgba(255,255,255,0.06);overflow:hidden}
.demo-progress-bar{height:100%;border-radius:999px;background:linear-gradient(90deg,#60a5fa,#818cf8,#60a5fa);background-size:200% 100%;animation:progress-pulse 1.8s ease infinite}
.demo-doc-status{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.demo-doc-pill{padding:4px 10px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em}
.demo-doc-pill.ready{background:rgba(74,222,128,0.16);color:#4ade80}
.demo-doc-pill.drafting{background:rgba(96,165,250,0.16);color:#93bbfc}
.demo-doc-pill.queued{background:rgba(148,163,184,0.12);color:#94a3b8}
.demo-doc-time{font-size:10px;color:#94a3b8}
.demo-doc-preview{display:flex;flex-direction:column;gap:6px}
.demo-doc-line{height:8px;border-radius:999px;background:linear-gradient(90deg,rgba(148,163,184,0.2),rgba(148,163,184,0.45),rgba(148,163,184,0.2));background-size:200% 100%;animation:progress-pulse 2s ease infinite}
.demo-doc-line.wide{width:90%}
.demo-doc-footnote{margin-top:10px;font-size:10px;color:#6b7280}

.agent-dot{width:6px;height:6px;border-radius:50%;display:inline-block;flex-shrink:0}
.agent-dot.running{background:#60a5fa;animation:pulse-glow 2s infinite}
.agent-dot.completed{background:#4ade80}
.agent-dot.failed{background:#f87171}
.agent-dot.pending{background:#6b7280}

.sec-chip{display:inline-flex;align-items:center;gap:2px;padding:1px 6px;border-radius:999px;font-size:9px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;animation:slide-in 0.25s ease-out}
.sec-chip.pass{background:rgba(74,222,128,0.12);color:#4ade80}
.sec-chip.pending{background:rgba(107,114,128,0.12);color:#94a3b8}

.sec-full-check{display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;font-size:11px;animation:slide-in 0.3s ease-out;transition:all 0.2s ease}
.sec-full-check.pass{background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.15)}
.sec-full-check.fail{background:rgba(248,113,113,0.1);color:#f87171;border:1px solid rgba(248,113,113,0.15)}
.sec-full-check.pending{background:rgba(107,114,128,0.06);color:#6b7280;border:1px solid rgba(107,114,128,0.1)}
.sec-full-icon{font-weight:700}
.sec-full-label{font-weight:500}

@media (max-width: 1200px) {
  .demo-grid{grid-template-columns:1fr}
}
`;

/* â”€â”€â”€ Style constants â”€â”€â”€ */

const shell: React.CSSProperties = {
  display: "flex",
  height: "calc(100vh - 120px)",
  gap: 0,
};

const mainCol: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};

const topBar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 20px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(13,15,20,0.6)",
  backdropFilter: "blur(12px)",
};

const chatArea: React.CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: "20px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const bBase: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 16,
  fontSize: 14,
  lineHeight: 1.5,
};

const bUser: React.CSSProperties = {
  background: "rgba(96,165,250,0.15)",
  borderBottomRightRadius: 4,
  color: "#e0e7ff",
};

const bSys: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  borderBottomLeftRadius: 4,
  color: "#d3d8e6",
};

const inputBar: React.CSSProperties = {
  padding: "12px 20px",
  borderTop: "1px solid rgba(255,255,255,0.06)",
  display: "flex",
  gap: 10,
  alignItems: "center",
  background: "rgba(13,15,20,0.6)",
  backdropFilter: "blur(12px)",
};

const chatInput: React.CSSProperties = {
  flex: 1,
  padding: "12px 18px",
  borderRadius: 14,
  fontSize: 14,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#f5f6f8",
  outline: "none",
  fontFamily: "inherit",
};

const sendBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  border: "none",
  fontSize: 18,
  fontWeight: 700,
  background: "rgba(96,165,250,0.2)",
  color: "#60a5fa",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const sidebarBox: React.CSSProperties = {
  width: 260,
  borderLeft: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(10,12,17,0.5)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  flexShrink: 0,
};

const pill: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 9px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
};

const sectionHead: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: 1,
  marginBottom: 6,
};

const dots: React.CSSProperties = { display: "flex", gap: 4, padding: "4px 0" };

const dot: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "#6b7280",
  animation: "blink 1.4s infinite both",
  display: "inline-block",
};

const card: React.CSSProperties = {
  padding: "14px",
  borderRadius: 14,
  background: "rgba(17,19,26,0.6)",
  border: "1px solid rgba(255,255,255,0.04)",
};

const cardTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#d3d8e6",
  marginBottom: 10,
};

const pipelineWrap: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 1fr)",
  gap: 10,
  position: "relative",
};

const pipelineStep: React.CSSProperties = {
  position: "relative",
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.04)",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const pipelineConnector: React.CSSProperties = {
  position: "absolute",
  right: -6,
  top: "50%",
  width: 12,
  height: 2,
  background: "rgba(255,255,255,0.15)",
};

const statusDot: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
};

const riskBar: React.CSSProperties = {
  height: 8,
  borderRadius: 999,
  overflow: "hidden",
  background: "rgba(255,255,255,0.05)",
  display: "flex",
  gap: 2,
};

