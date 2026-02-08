"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import Link from "next/link";
import type {
  MetricsSummary,
  GatewayRecord,
  InvokeEnvelope,
  KillSwitchRecord,
  SwarmRun,
} from "../../src/lib/openclaw-client";
import {
  getMetrics,
  listGateways,
  listInvocations,
  listKillSwitches,
  listSwarmRuns,
  invokeTool,
  chatWithAgent,
} from "../../src/lib/openclaw-client";

/* ─── Types ─── */

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
}

/* ─── Page ─── */

export default function OpenClawPage() {
  const [view, setView] = useState<ViewMode>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "system",
      content:
        "Hey! I'm your ClosedSheath operator. Ask me to run tools, check gateway status, or kick off swarm tasks.\n\n• \"list_sessions\" — invoke a tool\n• \"gateways\" — gateway status\n• \"metrics\" — system stats\n• \"swarms\" — swarm progress",
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
  });
  const chatEnd = useRef<HTMLDivElement>(null);

  /* poll sidebar data */
  useEffect(() => {
    const load = async () => {
      try {
        const [m, g, i, k, s] = await Promise.all([
          getMetrics(),
          listGateways(),
          listInvocations(),
          listKillSwitches(),
          listSwarmRuns(),
        ]);
        setSidebar({
          metrics: m ?? null,
          gateways: g?.gateways ?? [],
          invocations: (i?.invocations ?? []).slice(0, 20),
          killSwitches:
            k?.killSwitches?.filter((x: KillSwitchRecord) => x.active) ?? [],
          swarms: s?.runs ?? [],
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

  /* ─── intent parser ─── */

  const parseAndExecute = async (text: string): Promise<ChatMessage> => {
    const lo = text.toLowerCase().trim();

    if (lo.includes("gateway") || lo.includes("online")) {
      const r = await listGateways();
      const gws = r?.gateways ?? [];
      if (gws.length === 0) return sys("No gateways registered yet. Head to ⚡ Gateways to add one.");
      const lines = gws.map(
        (g) =>
          `• **${g.host}:${g.port}** — ${g.environment} — ${emoji(g.status)} ${g.status}`,
      );
      return sys(`**${gws.length} gateway${gws.length > 1 ? "s" : ""}:**\n\n${lines.join("\n")}`);
    }

    if (lo.includes("invocation") || lo.includes("history") || lo.includes("recent")) {
      const r = await listInvocations();
      const inv = (r?.invocations ?? []).slice(0, 6);
      if (inv.length === 0) return sys("No invocations yet — try invoking a tool!");
      const lines = inv.map(
        (v) =>
          `• \`${v.request.tool}\` → ${emoji(v.status)} ${v.status} (${v.durationMs ?? "?"}ms, policy: ${v.policyDecision})`,
      );
      return sys(`**Recent invocations:**\n\n${lines.join("\n")}`);
    }

    if (lo.includes("metric") || lo.includes("stats") || lo.includes("dashboard")) {
      const m = await getMetrics();
      if (!m) return sys("Couldn't load metrics — is the API running?");
      return sys(
        `📊 **Metrics:**\n\n• Invocations: **${m.totalInvocations}**\n• Allowed: **${m.allowedInvocations}** ✅\n• Denied: **${m.deniedInvocations}** ❌\n• Avg latency: **${m.avgDurationMs}ms**\n• Active swarms: **${m.activeSwarmRuns}**`,
      );
    }

    if (lo.includes("kill") || lo.includes("emergency") || lo.includes("safe")) {
      const r = await listKillSwitches();
      const active = (r?.killSwitches ?? []).filter((k: KillSwitchRecord) => k.active);
      if (active.length === 0)
        return sys("✅ **All clear.** No kill switches active.");
      const lines = active.map(
        (k: KillSwitchRecord) =>
          `• 🛑 **${k.scope}** → \`${k.targetId}\` — ${k.reason}`,
      );
      return sys(`⚠️ **${active.length} kill switch${active.length > 1 ? "es" : ""} active:**\n\n${lines.join("\n")}`);
    }

    if (lo.includes("swarm") || lo.includes("task") || lo.includes("agent")) {
      const r = await listSwarmRuns();
      const runs = r?.runs ?? [];
      if (runs.length === 0) return sys("No swarm runs yet. Create one in 🐝 Swarm.");
      const lines = runs.slice(0, 5).map(
        (run) =>
          `• **${run.swarmRunId.slice(0, 12)}…** — ${emoji(run.status)} ${run.status} — ${run.completedTasks}/${run.totalTasks} tasks`,
      );
      return sys(`**${runs.length} swarm run${runs.length > 1 ? "s" : ""}:**\n\n${lines.join("\n")}`);
    }

    if (lo.includes("help") || lo === "?") {
      return sys(
        "Here's what I can do:\n\n• **tool name** → invokes through middleware\n• **gateways** → gateway status\n• **invocations** → history\n• **metrics** → system stats\n• **kill switch** → safety status\n• **swarms** → swarm progress",
      );
    }

    /* explicit tool invocation: run/invoke/call <tool_name> */
    const explicitMatch = lo.match(/^(?:run|invoke|call|execute|use)\s+([a-z_]\w*)/);
    if (explicitMatch) {
      const tool = explicitMatch[1]!;
      const res = await invokeTool({ tool });
      if (!res)
        return sys(`❌ Failed to invoke \`${tool}\`. Check the gateway is online.`);

      const inv = res.invocation;
      const summary = inv.responseSummary
        ? `\n\n**Response:**\n\`\`\`\n${inv.responseSummary.slice(0, 800)}\n\`\`\``
        : "";
      return {
        ...sys(
          `${emoji(inv.status)} **${inv.request.tool}** → ${inv.status} in ${inv.durationMs ?? "?"}ms\n\nPolicy: ${inv.policyDecision} · Risk: T${inv.riskTier} · HTTP ${inv.httpStatus ?? "—"}${summary}`,
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

    /* default → send natural-language message to the OpenClaw agent */
    const chatResult = await chatWithAgent(text);
    if (!chatResult || !chatResult.reply) {
      return sys(`❌ No response from the agent. Is the gateway online?`);
    }
    return sys(`${chatResult.reply}\n\n_⏱ ${chatResult.durationMs}ms_`);
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((p) => [
      ...p,
      { id: `u_${Date.now()}`, role: "user", content: text, timestamp: Date.now() },
    ]);
    setInput("");
    setSending(true);

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

  /* ─── Render ─── */

  return (
    <div style={shell}>
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
              💬 Chat
            </Toggle>
            <Toggle on={view === "monitor"} onClick={() => setView("monitor")}>
              📊 Monitor
            </Toggle>
            <NavIcon href="/openclaw/gateways">⚡</NavIcon>
            <NavIcon href="/openclaw/tools">🛠</NavIcon>
            <NavIcon href="/openclaw/policy">📋</NavIcon>
            <NavIcon href="/openclaw/swarm">🐝</NavIcon>
            <NavIcon href="/openclaw/killswitch">🛑</NavIcon>
            <NavIcon href="/openclaw/audit">📜</NavIcon>
          </div>
        </header>

        {view === "chat" ? (
          <>
            {/* messages */}
            <div style={chatArea}>
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
                placeholder="Ask ClosedSheath anything… try 'list_sessions' or 'gateways'"
                style={chatInput}
                disabled={sending}
                autoFocus
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                style={sendBtn}
              >
                ↑
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

/* ═══════════ Components ═══════════ */

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
  const ok = gws.filter((g) => g.status === "healthy").length;
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

/* ─── Monitor view ─── */

function MonitorView({ data }: { data: SidebarData }) {
  const m = data.metrics;
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
            🛑 Active Kill Switches
          </div>
          {data.killSwitches.map((k) => (
            <div key={k.switchId} style={{ fontSize: 13, color: "#fca5a5", marginBottom: 2 }}>
              <strong>{k.scope}</strong> → {k.targetId} — {k.reason}
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
          {run.swarmRunId.slice(0, 16)}…
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

/* ─── Right sidebar ─── */

function Sidebar({ data }: { data: SidebarData }) {
  return (
    <aside style={sidebarBox}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>System Health</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "12px 14px" }}>
        <MiniKPI label="Gateways" value={data.gateways.length} icon="⚡" />
        <MiniKPI
          label="Active KS"
          value={data.killSwitches.length}
          icon="🛑"
          alert={data.killSwitches.length > 0}
        />
        <MiniKPI label="Invocations" value={data.invocations.length} icon="▶" />
        <MiniKPI
          label="Swarms"
          value={data.swarms.filter((s) => s.status === "running").length}
          icon="🐝"
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
        <SBLink href="/openclaw/gateways">⚡ Gateways</SBLink>
        <SBLink href="/openclaw/tools">🛠 Tools</SBLink>
        <SBLink href="/openclaw/policy">📋 Policy</SBLink>
        <SBLink href="/openclaw/audit">📜 Audit</SBLink>
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

/* ─── Helpers ─── */

function sys(content: string): ChatMessage {
  return {
    id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    role: "system",
    content,
    timestamp: Date.now(),
  };
}

function emoji(s: string) {
  if (s === "healthy" || s === "completed") return "✅";
  if (s === "degraded" || s === "pending") return "⏳";
  if (s === "failed" || s === "offline") return "❌";
  return "🔵";
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

/* ─── Style constants ─── */

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
