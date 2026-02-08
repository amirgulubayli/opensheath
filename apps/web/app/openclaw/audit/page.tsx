"use client";

import { useState, useEffect } from "react";
import type { AuditEntry } from "../../../src/lib/openclaw-client";
import { listAudit } from "../../../src/lib/openclaw-client";

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = async () => {
    const res = await listAudit();
    setEntries(res?.audit ?? []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const filtered = filter
    ? entries.filter((e) =>
        e.eventType.toLowerCase().includes(filter.toLowerCase()) ||
        e.resource.toLowerCase().includes(filter.toLowerCase()) ||
        e.action.toLowerCase().includes(filter.toLowerCase())
      )
    : entries;

  if (loading) return <Loading />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="title" style={{ margin: 0, fontSize: 24 }}>📜 Audit Trail</h1>
        <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
          Immutable record of all ClosedSheath operations
        </p>
      </div>

      {/* Stats */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <StatCard label="Total Events" value={entries.length} />
        <StatCard label="Allowed" value={entries.filter((e) => e.decision === "allow").length} color="#4ade80" />
        <StatCard label="Denied" value={entries.filter((e) => e.decision === "deny").length} color="#f87171" />
        <StatCard label="Unique Resources" value={new Set(entries.map((e) => e.resource)).size} color="#60a5fa" />
      </div>

      {/* Filter + refresh */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          placeholder="Filter by event type, resource, or action…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ flex: 1, maxWidth: 400 }}
        />
        <button onClick={refresh} style={secondaryBtn}>↻ Refresh</button>
        <span className="muted" style={{ fontSize: 12 }}>
          Showing {filtered.length} of {entries.length}
        </span>
      </div>

      {/* Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {filtered.length === 0 ? (
          <div className="card muted" style={{ textAlign: "center", padding: 40 }}>No audit entries</div>
        ) : filtered.map((e) => (
          <div
            key={e.auditId}
            className="card"
            style={{ padding: "12px 16px", cursor: "pointer", borderLeft: `3px solid ${e.decision === "allow" ? "#4ade80" : e.decision === "deny" ? "#f87171" : "#60a5fa"}` }}
            onClick={() => setExpandedId(expandedId === e.auditId ? null : e.auditId)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <EventBadge type={e.eventType} />
                <span style={{ fontFamily: "monospace", fontSize: 13 }}>{e.resource}</span>
                <span className="muted" style={{ fontSize: 13 }}>→ {e.action}</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <DecisionBadge decision={e.decision} />
                <RiskDot tier={e.riskTier} />
                <span className="muted" style={{ fontSize: 12 }}>{relTime(e.timestamp)}</span>
              </div>
            </div>

            {expandedId === e.auditId && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(16,18,24,0.8)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                  <Detail label="Audit ID" value={e.auditId} />
                  <Detail label="Workspace" value={e.workspaceId} />
                  <Detail label="Correlation" value={e.correlationId} />
                  <Detail label="Trace" value={e.traceId} />
                  <Detail label="Risk Tier" value={`${e.riskTier}`} />
                  <Detail label="Timestamp" value={new Date(e.timestamp).toLocaleString()} />
                </div>
                {Object.keys(e.details).length > 0 && (
                  <div style={{ fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-all", color: "#9aa2b6", maxHeight: 200, overflow: "auto" }}>
                    {JSON.stringify(e.details, null, 2)}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Micro-components ──

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

function EventBadge({ type }: { type: string }) {
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, background: "rgba(96,165,250,0.15)", color: "#60a5fa", fontSize: 11, fontWeight: 600, letterSpacing: 0.3 }}>{type}</span>;
}

function DecisionBadge({ decision }: { decision: string }) {
  const c = decision === "allow" ? "#4ade80" : decision === "deny" ? "#f87171" : "#facc15";
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, background: `${c}22`, color: c, fontSize: 11, fontWeight: 600 }}>{decision}</span>;
}

function RiskDot({ tier }: { tier: number }) {
  const colors = ["#4ade80", "#facc15", "#fb923c", "#f87171"];
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[tier] ?? "#9aa2b6", display: "inline-block" }} title={`Tier ${tier}`} />;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 10, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontFamily: "monospace", wordBreak: "break-all" }}>{value}</div>
    </div>
  );
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

const secondaryBtn: React.CSSProperties = {
  padding: "6px 14px", fontSize: 13, borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)", color: "#9aa2b6",
  cursor: "pointer",
};
