"use client";

import { useState, useEffect, type FormEvent } from "react";
import type { KillSwitchRecord } from "../../../src/lib/openclaw-client";
import { listKillSwitches, activateKillSwitch, deactivateKillSwitch } from "../../../src/lib/openclaw-client";

export default function KillSwitchPage() {
  const [switches, setSwitches] = useState<KillSwitchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const res = await listKillSwitches();
    setSwitches(res?.killSwitches ?? []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleActivate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    await activateKillSwitch({
      scope: fd.get("scope") as string,
      targetId: fd.get("targetId") as string,
      reason: fd.get("reason") as string,
    });
    setShowForm(false);
    setBusy(false);
    await refresh();
  };

  const handleDeactivate = async (scope: string, targetId: string) => {
    if (!confirm(`Deactivate kill switch for ${targetId}?`)) return;
    await deactivateKillSwitch({ scope, targetId });
    await refresh();
  };

  const active = switches.filter((s) => s.active);
  const inactive = switches.filter((s) => !s.active);

  if (loading) return <Loading />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="title" style={{ margin: 0, fontSize: 24 }}>🛑 Kill Switch</h1>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
            Emergency controls to halt tool execution
          </p>
        </div>
        {active.length > 0 && (
          <span style={alertBadge}>
            ⚠ {active.length} ACTIVE
          </span>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setShowForm(!showForm)} style={dangerBtn}>
          {showForm ? "Cancel" : "⚠ Activate Kill Switch"}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={handleActivate} style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", border: "1px solid rgba(248,113,113,0.3)" }}>
          <select name="scope" required>
            <option value="">Select scope…</option>
            <option value="workspace">Workspace</option>
            <option value="gateway">Gateway</option>
            <option value="tool">Tool</option>
            <option value="agent">Agent</option>
            <option value="global">Global</option>
          </select>
          <input name="targetId" placeholder="Target ID (e.g. workspace ID, tool name)" required />
          <input name="reason" placeholder="Reason for activation" required style={{ gridColumn: "span 2" }} />
          <button type="submit" disabled={busy} style={{ ...dangerBtn, gridColumn: "span 2" }}>
            {busy ? "Activating…" : "🛑 Confirm Activation"}
          </button>
        </form>
      )}

      {/* Active switches */}
      {active.length > 0 && (
        <section>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10, color: "#f87171" }}>
            🔴 Active Kill Switches
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {active.map((s) => (
              <div key={s.switchId} className="card" style={{ border: "1px solid rgba(248,113,113,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <ScopeBadge scope={s.scope} />
                    <span style={{ fontFamily: "monospace", fontSize: 14 }}>{s.targetId}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {s.reason} · by {s.activatedBy} · {new Date(s.activatedAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => handleDeactivate(s.scope, s.targetId)}
                  style={{
                    padding: "6px 14px", fontSize: 13, borderRadius: 8,
                    border: "1px solid rgba(74,222,128,0.3)",
                    background: "rgba(74,222,128,0.1)",
                    color: "#4ade80", cursor: "pointer", fontWeight: 600,
                  }}
                >
                  Deactivate
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* History */}
      <section>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
          History ({switches.length})
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Scope</th>
              <th>Target</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Activated</th>
              <th>Deactivated</th>
            </tr>
          </thead>
          <tbody>
            {switches.length === 0 ? (
              <tr><td colSpan={7} className="muted" style={{ textAlign: "center", padding: 32 }}>No kill switches in history</td></tr>
            ) : switches.map((s) => (
              <tr key={s.switchId} style={{ opacity: s.active ? 1 : 0.6 }}>
                <td style={mono}>{s.switchId.slice(0, 12)}…</td>
                <td><ScopeBadge scope={s.scope} /></td>
                <td style={mono}>{s.targetId}</td>
                <td style={{ fontSize: 13 }}>{s.reason}</td>
                <td>
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, background: s.active ? "rgba(248,113,113,0.15)" : "rgba(74,222,128,0.15)", color: s.active ? "#f87171" : "#4ade80", fontSize: 12, fontWeight: 600 }}>
                    {s.active ? "ACTIVE" : "resolved"}
                  </span>
                </td>
                <td className="muted" style={{ fontSize: 12 }}>{new Date(s.activatedAt).toLocaleString()}</td>
                <td className="muted" style={{ fontSize: 12 }}>{s.deactivatedAt ? new Date(s.deactivatedAt).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Loading() {
  return <div style={{ display: "flex", justifyContent: "center", paddingTop: 120 }}><div className="muted" style={{ fontSize: 15, letterSpacing: 2 }}>LOADING…</div></div>;
}

function ScopeBadge({ scope }: { scope: string }) {
  const colors: Record<string, string> = { global: "#f87171", workspace: "#60a5fa", gateway: "#c084fc", tool: "#facc15", agent: "#fb923c" };
  const c = colors[scope] ?? "#9aa2b6";
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, background: `${c}22`, color: c, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{scope}</span>;
}

const mono: React.CSSProperties = { fontFamily: "monospace", fontSize: 13 };
const dangerBtn: React.CSSProperties = {
  padding: "8px 16px", fontSize: 13, borderRadius: 10,
  border: "1px solid rgba(248,113,113,0.3)",
  background: "rgba(248,113,113,0.12)", color: "#f87171",
  cursor: "pointer", fontWeight: 600,
};
const alertBadge: React.CSSProperties = {
  display: "inline-block", padding: "6px 14px", borderRadius: 999,
  background: "rgba(248,113,113,0.15)", color: "#f87171",
  fontSize: 13, fontWeight: 700, letterSpacing: 1,
  animation: "pulse 2s infinite",
};
