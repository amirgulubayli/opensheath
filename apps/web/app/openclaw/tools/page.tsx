"use client";

import { useState, useEffect, type FormEvent } from "react";
import type { ToolCatalogEntry } from "../../../src/lib/openclaw-client";
import { listTools, registerTool, quarantineTool, listGateways } from "../../../src/lib/openclaw-client";

export default function ToolsPage() {
  const [tools, setTools] = useState<ToolCatalogEntry[]>([]);
  const [gatewayIds, setGatewayIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");

  const refresh = async () => {
    const [tRes, gRes] = await Promise.all([listTools(), listGateways()]);
    setTools(tRes?.tools ?? []);
    setGatewayIds((gRes?.gateways ?? []).map((g) => g.gatewayId));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const desc = (fd.get("description") as string);
    await registerTool({
      toolName: fd.get("toolName") as string,
      gatewayId: fd.get("gatewayId") as string,
      riskTier: Number(fd.get("riskTier")),
      ...(desc ? { description: desc } : {}),
    });
    setShowForm(false);
    setBusy(false);
    await refresh();
  };

  const handleQuarantine = async (toolName: string, gatewayId: string) => {
    if (!confirm(`Quarantine tool "${toolName}"?`)) return;
    await quarantineTool({ toolName, gatewayId });
    await refresh();
  };

  const filtered = filter
    ? tools.filter((t) =>
        t.toolName.toLowerCase().includes(filter.toLowerCase()) ||
        (t.description ?? "").toLowerCase().includes(filter.toLowerCase())
      )
    : tools;

  if (loading) return <Loading />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="title" style={{ margin: 0, fontSize: 24 }}>🛠 Tool Catalog</h1>
        <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
          Registered tools, risk tiers, and quarantine controls
        </p>
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          placeholder="Search tools…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ flex: 1, maxWidth: 320 }}
        />
        <button onClick={() => setShowForm(!showForm)} style={actionBtn}>
          {showForm ? "Cancel" : "+ Register Tool"}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={handleRegister} style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <input name="toolName" placeholder="Tool name (e.g. list_sessions)" required />
          <select name="gatewayId" required>
            <option value="">Select gateway…</option>
            {gatewayIds.map((id) => (
              <option key={id} value={id}>{id.slice(0, 20)}…</option>
            ))}
          </select>
          <select name="riskTier" required>
            <option value="0">Tier 0 — Low</option>
            <option value="1">Tier 1 — Medium</option>
            <option value="2">Tier 2 — High</option>
            <option value="3">Tier 3 — Critical</option>
          </select>
          <input name="description" placeholder="Description (optional)" />
          <button type="submit" disabled={busy} style={{ ...actionBtn, gridColumn: "span 2" }}>
            {busy ? "Registering…" : "Register Tool"}
          </button>
        </form>
      )}

      {/* Stats strip */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <StatCard label="Total Tools" value={tools.length} />
        <StatCard label="Approved" value={tools.filter((t) => t.reviewStatus === "approved").length} color="#4ade80" />
        <StatCard label="Pending" value={tools.filter((t) => t.reviewStatus === "pending").length} color="#facc15" />
        <StatCard label="Quarantined" value={tools.filter((t) => t.reviewStatus === "quarantined").length} color="#f87171" />
      </div>

      {/* Table */}
      <table>
        <thead>
          <tr>
            <th>Tool</th>
            <th>Risk</th>
            <th>Approval</th>
            <th>Status</th>
            <th>Actions</th>
            <th>Gateway</th>
            <th style={{ textAlign: "right" }}>Controls</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={7} className="muted" style={{ textAlign: "center", padding: 32 }}>No tools found</td></tr>
          ) : filtered.map((t) => (
            <tr key={`${t.toolName}-${t.gatewayId}`} style={{ opacity: t.reviewStatus === "quarantined" ? 0.5 : 1 }}>
              <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                {t.toolName}
                {t.description && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{t.description}</div>}
              </td>
              <td><RiskBadge tier={t.riskTier} /></td>
              <td style={{ fontSize: 13 }}>{t.approvalRequired}</td>
              <td><ReviewBadge status={t.reviewStatus} /></td>
              <td className="muted" style={{ fontSize: 12 }}>{t.allowedActions.join(", ") || "—"}</td>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>{t.gatewayId.slice(0, 12)}…</td>
              <td style={{ textAlign: "right" }}>
                {t.reviewStatus !== "quarantined" && (
                  <button
                    onClick={() => handleQuarantine(t.toolName, t.gatewayId)}
                    style={{
                      padding: "4px 10px", fontSize: 12, borderRadius: 8,
                      border: "1px solid rgba(248,113,113,0.3)",
                      background: "rgba(248,113,113,0.1)",
                      color: "#f87171", cursor: "pointer",
                    }}
                  >
                    Quarantine
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Loading() {
  return <div style={{ display: "flex", justifyContent: "center", paddingTop: 120 }}><div className="muted" style={{ fontSize: 15, letterSpacing: 2 }}>LOADING…</div></div>;
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? "#f5f6f8", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function RiskBadge({ tier }: { tier: number }) {
  const colors = ["#4ade80", "#facc15", "#fb923c", "#f87171"];
  const labels = ["Low", "Medium", "High", "Critical"];
  const c = colors[tier] ?? "#9aa2b6";
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, background: `${c}22`, color: c, fontSize: 12, fontWeight: 600 }}>{labels[tier] ?? `T${tier}`}</span>;
}

function ReviewBadge({ status }: { status: string }) {
  const c = status === "approved" ? "#4ade80" : status === "quarantined" ? "#f87171" : "#facc15";
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, background: `${c}22`, color: c, fontSize: 12, fontWeight: 600 }}>{status}</span>;
}

const actionBtn: React.CSSProperties = {
  padding: "8px 16px", fontSize: 13, borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(96,165,250,0.12)", color: "#60a5fa",
  cursor: "pointer", fontWeight: 600,
};
