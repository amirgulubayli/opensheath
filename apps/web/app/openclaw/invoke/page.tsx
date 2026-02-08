"use client";

import { useState, useEffect, type FormEvent } from "react";
import type { InvokeEnvelope } from "../../../src/lib/openclaw-client";
import { invokeTool, listInvocations } from "../../../src/lib/openclaw-client";

export default function InvokePage() {
  const [invocations, setInvocations] = useState<InvokeEnvelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoking, setInvoking] = useState(false);
  const [result, setResult] = useState<InvokeEnvelope | null>(null);
  const [argsText, setArgsText] = useState("{}");

  const refresh = async () => {
    const res = await listInvocations();
    setInvocations(res?.invocations ?? []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleInvoke = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInvoking(true);
    setResult(null);
    const fd = new FormData(e.currentTarget);
    let args: Record<string, unknown> = {};
    try { args = JSON.parse(argsText); } catch { /* ignore */ }
    const actionVal = (fd.get("action") as string);
    const sessionVal = (fd.get("sessionKey") as string);
    const res = await invokeTool({
      tool: fd.get("tool") as string,
      ...(actionVal ? { action: actionVal } : {}),
      args,
      ...(sessionVal ? { sessionKey: sessionVal } : {}),
    });
    setResult(res?.invocation ?? null);
    setInvoking(false);
    await refresh();
  };

  if (loading) return <Loading />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="title" style={{ margin: 0, fontSize: 24 }}>▶ Tool Invocation</h1>
        <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
          Invoke tools through the 7-step middleware chain
        </p>
      </div>

      {/* Invoke form */}
      <form className="card" onSubmit={handleInvoke} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="title" style={{ fontSize: 16, margin: 0 }}>Execute Tool</div>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <input name="tool" placeholder="Tool name (e.g. list_sessions)" required />
          <input name="action" placeholder="Action (optional)" />
          <input name="sessionKey" placeholder="Session key (optional)" />
          <div />
        </div>
        <div>
          <label className="muted" style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Arguments (JSON)</label>
          <textarea
            value={argsText}
            onChange={(e) => setArgsText(e.target.value)}
            rows={3}
            style={{ width: "100%", fontFamily: "monospace", fontSize: 13, resize: "vertical" }}
          />
        </div>
        <button type="submit" disabled={invoking} style={primaryBtn}>
          {invoking ? "Invoking…" : "⚡ Invoke Tool"}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className="card" style={{ border: `1px solid ${result.status === "completed" ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}` }}>
          <div className="title" style={{ fontSize: 16, margin: "0 0 12px" }}>
            Invocation Result
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Detail label="ID" value={result.invocationId} mono />
            <Detail label="Tool" value={result.request.tool} mono />
            <Detail label="Status" value={result.status} badge={result.status === "completed" ? "ok" : "error"} />
            <Detail label="Policy" value={result.policyDecision} badge={result.policyDecision === "allow" ? "ok" : "error"} />
            <Detail label="Risk Tier" value={`${result.riskTier}`} />
            <Detail label="Duration" value={result.durationMs != null ? `${result.durationMs}ms` : "—"} />
            <Detail label="HTTP" value={result.httpStatus != null ? `${result.httpStatus}` : "—"} />
            <Detail label="Trace" value={result.traceId} mono />
          </div>
          {result.responseSummary && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(16,18,24,0.8)", fontFamily: "monospace", fontSize: 12, maxHeight: 200, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {result.responseSummary}
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Invocation History ({invocations.length})</div>
        <button onClick={refresh} style={secondaryBtn}>↻ Refresh</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Tool</th>
            <th>Status</th>
            <th>Policy</th>
            <th>Risk</th>
            <th>Duration</th>
            <th>HTTP</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {invocations.length === 0 ? (
            <tr><td colSpan={7} className="muted" style={{ textAlign: "center", padding: 32 }}>No invocations yet</td></tr>
          ) : invocations.map((inv) => (
            <tr key={inv.invocationId}>
              <td style={{ fontFamily: "monospace", fontSize: 13 }}>{inv.request.tool}</td>
              <td><StatusBadge status={inv.status} /></td>
              <td><DecisionBadge decision={inv.policyDecision} /></td>
              <td><RiskBadge tier={inv.riskTier} /></td>
              <td>{inv.durationMs != null ? `${inv.durationMs}ms` : "—"}</td>
              <td className="muted">{inv.httpStatus ?? "—"}</td>
              <td className="muted" style={{ fontSize: 12 }}>{relTime(inv.startedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Micro-components ──

function Loading() {
  return <div style={{ display: "flex", justifyContent: "center", paddingTop: 120 }}><div className="muted" style={{ fontSize: 15, letterSpacing: 2 }}>LOADING…</div></div>;
}

function Detail({ label, value, mono, badge }: { label: string; value: string; mono?: boolean; badge?: "ok" | "error" }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>{label}</div>
      {badge ? (
        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, background: badge === "ok" ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)", color: badge === "ok" ? "#4ade80" : "#f87171", fontSize: 13, fontWeight: 600 }}>{value}</span>
      ) : (
        <div style={{ fontSize: 13, fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all" }}>{value}</div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = status === "completed" ? "#4ade80" : status === "pending" ? "#facc15" : "#f87171";
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, background: `${c}22`, color: c, fontSize: 12, fontWeight: 600 }}>{status}</span>;
}

function DecisionBadge({ decision }: { decision: string }) {
  const c = decision === "allow" ? "#4ade80" : decision === "deny" ? "#f87171" : "#facc15";
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, background: `${c}22`, color: c, fontSize: 12, fontWeight: 600 }}>{decision}</span>;
}

function RiskBadge({ tier }: { tier: number }) {
  const colors = ["#4ade80", "#facc15", "#fb923c", "#f87171"];
  const labels = ["Low", "Medium", "High", "Critical"];
  const c = colors[tier] ?? "#9aa2b6";
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, background: `${c}22`, color: c, fontSize: 12, fontWeight: 600 }}>{labels[tier] ?? `T${tier}`}</span>;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

const primaryBtn: React.CSSProperties = {
  padding: "10px 20px", fontSize: 14, borderRadius: 10,
  border: "1px solid rgba(96,165,250,0.3)",
  background: "rgba(96,165,250,0.18)", color: "#60a5fa",
  cursor: "pointer", fontWeight: 700, letterSpacing: 0.3,
};
const secondaryBtn: React.CSSProperties = {
  padding: "6px 14px", fontSize: 13, borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)", color: "#9aa2b6",
  cursor: "pointer",
};
