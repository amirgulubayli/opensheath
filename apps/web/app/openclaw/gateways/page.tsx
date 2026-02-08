"use client";

import { useState, useEffect, type FormEvent } from "react";
import type { GatewayRecord, BindingRecord } from "../../../src/lib/openclaw-client";
import {
  listGateways,
  registerGateway,
  updateGatewayHealth,
  listBindings,
  createBinding,
} from "../../../src/lib/openclaw-client";

export default function GatewaysPage() {
  const [gateways, setGateways] = useState<GatewayRecord[]>([]);
  const [bindings, setBindings] = useState<BindingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"gateways" | "bindings">("gateways");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [gRes, bRes] = await Promise.all([listGateways(), listBindings()]);
    setGateways(gRes?.gateways ?? []);
    setBindings(bRes?.bindings ?? []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const bp = (fd.get("basePath") as string);
    await registerGateway({
      environment: fd.get("environment") as string,
      host: fd.get("host") as string,
      port: Number(fd.get("port")),
      authMode: fd.get("authMode") as string,
      tokenRef: fd.get("tokenRef") as string,
      ...(bp ? { basePath: bp } : {}),
      ...(fd.get("loopbackOnly") === "on" ? { loopbackOnly: true } : {}),
    });
    setShowForm(false);
    setBusy(false);
    await refresh();
  };

  const handleBind = async (gatewayId: string) => {
    setBusy(true);
    await createBinding({ workspaceId: "ethoxford-ws", gatewayId });
    setBusy(false);
    await refresh();
  };

  const handleHealth = async (gatewayId: string, status: string) => {
    await updateGatewayHealth({ gatewayId, status });
    await refresh();
  };

  if (loading) return <Loading />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Header />

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 8 }}>
        <TabBtn active={tab === "gateways"} onClick={() => setTab("gateways")}>
          ⚡ Gateways ({gateways.length})
        </TabBtn>
        <TabBtn active={tab === "bindings"} onClick={() => setTab("bindings")}>
          🔗 Bindings ({bindings.length})
        </TabBtn>
      </div>

      {tab === "gateways" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(!showForm)} style={actionBtn}>
              {showForm ? "Cancel" : "+ Register Gateway"}
            </button>
          </div>

          {showForm && (
            <form className="card" onSubmit={handleRegister} style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
              <input name="environment" placeholder="Environment (e.g. production)" required />
              <input name="host" placeholder="Host (e.g. 100.111.98.27)" required />
              <input name="port" type="number" placeholder="Port (e.g. 18790)" required />
              <select name="authMode" required>
                <option value="token">Token</option>
                <option value="mtls">mTLS</option>
                <option value="none">None</option>
              </select>
              <input name="tokenRef" placeholder="Token reference" />
              <input name="basePath" placeholder="Base path (optional)" />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#9aa2b6" }}>
                <input type="checkbox" name="loopbackOnly" />
                Loopback only
              </label>
              <button type="submit" disabled={busy} style={{ ...actionBtn, gridColumn: "span 2" }}>
                {busy ? "Registering…" : "Register"}
              </button>
            </form>
          )}

          <table>
            <thead>
              <tr>
                <th>Gateway ID</th>
                <th>Host</th>
                <th>Port</th>
                <th>Env</th>
                <th>Auth</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {gateways.length === 0 ? (
                <tr><td colSpan={7} className="muted" style={{ textAlign: "center", padding: 32 }}>No gateways registered</td></tr>
              ) : gateways.map((g) => (
                <tr key={g.gatewayId}>
                  <td style={mono}>{g.gatewayId.slice(0, 14)}…</td>
                  <td>{g.host}</td>
                  <td>{g.port}</td>
                  <td>{g.environment}</td>
                  <td>{g.authMode}</td>
                  <td><StatusDot status={g.status} /></td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {!bindings.some((b) => b.gatewayId === g.gatewayId) && (
                        <SmallBtn onClick={() => handleBind(g.gatewayId)} disabled={busy}>Bind</SmallBtn>
                      )}
                      <SmallBtn onClick={() => handleHealth(g.gatewayId, "healthy")}>✓ Healthy</SmallBtn>
                      <SmallBtn onClick={() => handleHealth(g.gatewayId, "degraded")} variant="warn">⚠ Degrade</SmallBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {tab === "bindings" && (
        <table>
          <thead>
            <tr>
              <th>Binding ID</th>
              <th>Workspace</th>
              <th>Gateway</th>
              <th>Session Key</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {bindings.length === 0 ? (
              <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 32 }}>No bindings yet</td></tr>
            ) : bindings.map((b) => (
              <tr key={b.bindingId}>
                <td style={mono}>{b.bindingId.slice(0, 14)}…</td>
                <td>{b.workspaceId}</td>
                <td style={mono}>{b.gatewayId.slice(0, 14)}…</td>
                <td style={mono}>{b.defaultSessionKey.slice(0, 20)}…</td>
                <td className="muted" style={{ fontSize: 12 }}>{new Date(b.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Micro-components ──

function Header() {
  return (
    <div>
      <h1 className="title" style={{ margin: 0, fontSize: 24 }}>⚡ Gateways & Bindings</h1>
      <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
        Register ClosedSheath gateway instances and bind workspaces
      </p>
    </div>
  );
}

function Loading() {
  return <div style={{ display: "flex", justifyContent: "center", paddingTop: 120 }}><div className="muted" style={{ fontSize: 15, letterSpacing: 2 }}>LOADING…</div></div>;
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...actionBtn,
        background: active ? "rgba(96,165,250,0.15)" : "rgba(16,18,24,0.9)",
        color: active ? "#60a5fa" : "#9aa2b6",
        borderColor: active ? "rgba(96,165,250,0.3)" : "rgba(255,255,255,0.08)",
      }}
    >
      {children}
    </button>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "healthy" ? "#4ade80" : status === "degraded" ? "#facc15" : status === "offline" ? "#f87171" : "#60a5fa";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
      {status}
    </span>
  );
}

function SmallBtn({ onClick, children, disabled, variant }: { onClick: () => void; children: React.ReactNode; disabled?: boolean; variant?: "warn" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "4px 10px",
        fontSize: 12,
        borderRadius: 8,
        border: `1px solid ${variant === "warn" ? "rgba(250,204,21,0.3)" : "rgba(255,255,255,0.1)"}`,
        background: variant === "warn" ? "rgba(250,204,21,0.1)" : "rgba(255,255,255,0.05)",
        color: variant === "warn" ? "#facc15" : "#d3d8e6",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

const mono: React.CSSProperties = { fontFamily: "monospace", fontSize: 13 };
const actionBtn: React.CSSProperties = {
  padding: "8px 16px",
  fontSize: 13,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(96,165,250,0.12)",
  color: "#60a5fa",
  cursor: "pointer",
  fontWeight: 600,
};
