"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  listConnectors,
  registerConnector,
  revokeConnector,
  recordConnectorHealth,
} from "../../src/lib/api-client";
import { listGateways, discoverCapabilities, getConnections, type GatewayRecord, type DiscoveredCapability, type ConnectionsOverview } from "../../src/lib/openclaw-client";
import { getSession } from "../../src/lib/session";
import {
  mapConnectorsToDashboard,
  type ConnectorDashboardState,
  type ConnectorCardViewModel,
} from "../../src/integration-automation-adapter";

type Tab = "connectors" | "gateways" | "add";

interface CredentialTemplate {
  label: string;
  prefix: string;
  placeholder: string;
  hint: string;
}

const CREDENTIAL_TEMPLATES: Record<string, CredentialTemplate[]> = {
  oauth: [
    {
      label: "Vault Reference",
      prefix: "vault://",
      placeholder: "vault://secrets/integrations/slack-oauth",
      hint: "Points to a secret stored in your vault. The API key never leaves the vault.",
    },
    {
      label: "AWS Secrets Manager",
      prefix: "aws-sm://",
      placeholder: "aws-sm://prod/integrations/slack-oauth",
      hint: "ARN or path to an AWS Secrets Manager secret.",
    },
  ],
  api_key: [
    {
      label: "Vault Reference",
      prefix: "vault://",
      placeholder: "vault://secrets/integrations/slack-api-key",
      hint: "Points to a secret stored in your vault. The raw key is never exposed.",
    },
    {
      label: "Env Variable",
      prefix: "env://",
      placeholder: "env://SLACK_API_KEY",
      hint: "References a server-side environment variable. Never sent to the browser.",
    },
    {
      label: "AWS Secrets Manager",
      prefix: "aws-sm://",
      placeholder: "aws-sm://prod/integrations/slack-key",
      hint: "ARN or path to an AWS Secrets Manager secret.",
    },
  ],
};

const PROVIDER_PRESETS = [
  { value: "slack", label: "Slack", icon: "💬" },
  { value: "github", label: "GitHub", icon: "🐙" },
  { value: "linear", label: "Linear", icon: "📐" },
  { value: "notion", label: "Notion", icon: "📝" },
  { value: "jira", label: "Jira", icon: "🎫" },
  { value: "discord", label: "Discord", icon: "🎮" },
  { value: "google", label: "Google", icon: "🔍" },
  { value: "custom", label: "Custom…", icon: "⚙️" },
];

const DEMO_CONNECTIONS = [
  {
    id: "google-workspace",
    name: "Google Workspace",
    icon: "🟢",
    status: "connected",
    note: "Calendar + Gmail + Drive",
    lastSync: "just now",
    scopes: ["Calendar", "Gmail", "Drive"],
  },
  {
    id: "twitter",
    name: "Twitter",
    icon: "🐦",
    status: "connected",
    note: "Brand monitoring + outreach",
    lastSync: "2m ago",
    scopes: ["Search", "DMs", "Mentions"],
  },
  {
    id: "trello",
    name: "Trello",
    icon: "🧩",
    status: "connected",
    note: "Workflow tasks + approvals",
    lastSync: "5m ago",
    scopes: ["Boards", "Cards", "Members"],
  },
];

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "connected" || status === "healthy"
      ? "#22c55e"
      : status === "degraded"
        ? "#f59e0b"
        : "#ef4444";
  const label =
    status === "connected"
      ? "Connected"
      : status === "degraded"
        ? "Degraded"
        : status === "revoked"
          ? "Revoked"
          : status === "healthy"
            ? "Healthy"
            : status;

  return (
    <span className="status-badge" style={{ color, borderColor: color }}>
      <span className="status-dot" style={{ background: color }} />
      {label}
    </span>
  );
}

function GatewayStatusBadge({ status }: { status: string }) {
  const color =
    status === "healthy"
      ? "#22c55e"
      : status === "degraded"
        ? "#f59e0b"
        : "#ef4444";
  return (
    <span className="status-badge" style={{ color, borderColor: color }}>
      <span className="status-dot" style={{ background: color }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function TimeAgo({ iso }: { iso: string }) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return <span className="muted-sm">just now</span>;
  if (ms < 3_600_000) return <span className="muted-sm">{Math.floor(ms / 60_000)}m ago</span>;
  if (ms < 86_400_000) return <span className="muted-sm">{Math.floor(ms / 3_600_000)}h ago</span>;
  return <span className="muted-sm">{Math.floor(ms / 86_400_000)}d ago</span>;
}

export default function IntegrationsPage() {
  const [tab, setTab] = useState<Tab>("connectors");
  const [connectorState, setConnectorState] = useState<
    ConnectorDashboardState | { status: "loading" }
  >({ status: "loading" });
  const [gateways, setGateways] = useState<GatewayRecord[]>([]);
  const [gatewayLoading, setGatewayLoading] = useState(true);
  const [showGateways, setShowGateways] = useState(false);
  const [capabilities, setCapabilities] = useState<DiscoveredCapability[]>([]);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true);
  const [capabilitiesError, setCapabilitiesError] = useState<string | null>(null);
  const [connections, setConnections] = useState<ConnectionsOverview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Add-new form state ──
  const [provider, setProvider] = useState("slack");
  const [customProvider, setCustomProvider] = useState("");
  const [authType, setAuthType] = useState<"oauth" | "api_key">("oauth");
  const [credentialReference, setCredentialReference] = useState("vault://");
  const [selectedTemplate, setSelectedTemplate] = useState(0);

  const refreshConnectors = useCallback(async () => {
    const session = getSession();
    if (!session) {
      setConnectorState({ status: "error", connectors: [], message: "Sign in required." });
      return;
    }
    const response = await listConnectors({
      sessionId: session.sessionId,
      workspaceId: session.workspaceId,
    });
    setConnectorState(mapConnectorsToDashboard(response));
  }, []);

  const refreshGateways = useCallback(async () => {
    setGatewayLoading(true);
    try {
      const data = await listGateways();
      setGateways(data?.gateways ?? []);
    } catch {
      setGateways([]);
    } finally {
      setGatewayLoading(false);
    }
  }, []);

  const refreshCapabilities = useCallback(async () => {
    setCapabilitiesLoading(true);
    setCapabilitiesError(null);
    try {
      const data = await discoverCapabilities();
      setCapabilities(data?.capabilities ?? []);
    } catch {
      setCapabilitiesError("Failed to discover capabilities from OpenClaw agent.");
      setCapabilities([]);
    } finally {
      setCapabilitiesLoading(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    void refreshConnectors();
    void refreshGateways();
    void refreshCapabilities();
    void getConnections().then((c) => setConnections(c)).catch(() => {});
  }, [refreshConnectors, refreshGateways, refreshCapabilities]);

  // Auto-fetch on mount + poll every 30s
  useEffect(() => {
    refreshAll();
    pollRef.current = setInterval(refreshAll, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refreshAll]);

  // ── Actions ──
  async function handleRevoke(connectorId: string) {
    if (confirmRevoke !== connectorId) {
      setConfirmRevoke(connectorId);
      return;
    }
    const session = getSession();
    if (!session) return;
    setActionLoading(connectorId);
    setConfirmRevoke(null);
    try {
      const res = await revokeConnector({ sessionId: session.sessionId, connectorId });
      if (res.ok) {
        setMessage(`Connector ${connectorId.slice(0, 12)}… revoked.`);
      } else {
        setMessage("Failed to revoke connector.");
      }
    } catch {
      setMessage("Error revoking connector.");
    } finally {
      setActionLoading(null);
      await refreshConnectors();
    }
  }

  async function handleReconnect(connectorId: string) {
    const session = getSession();
    if (!session) return;
    setActionLoading(connectorId);
    try {
      const res = await recordConnectorHealth({
        sessionId: session.sessionId,
        connectorId,
        healthStatus: "healthy",
      });
      if (res.ok) {
        setMessage(`Connector reconnected successfully.`);
      } else {
        setMessage("Failed to reconnect.");
      }
    } catch {
      setMessage("Error reconnecting.");
    } finally {
      setActionLoading(null);
      await refreshConnectors();
    }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) {
      setMessage("Sign in required.");
      return;
    }

    const resolvedProvider = provider === "custom" ? customProvider.trim() : provider;
    if (!resolvedProvider) {
      setMessage("Please enter a provider name.");
      return;
    }

    // Validate credential reference uses a secure scheme
    const secureSchemes = ["vault://", "aws-sm://", "env://", "gcp-sm://", "az-kv://"];
    const usesSecureScheme = secureSchemes.some((scheme) =>
      credentialReference.startsWith(scheme),
    );
    if (!usesSecureScheme) {
      setMessage(
        "⚠️ Credential must use a secure reference (vault://, aws-sm://, env://, etc). Raw keys are not accepted.",
      );
      return;
    }

    if (credentialReference.split("://")[1]?.trim().length === 0) {
      setMessage("Please provide a path after the scheme prefix.");
      return;
    }

    setActionLoading("register");
    try {
      const response = await registerConnector({
        sessionId: session.sessionId,
        provider: resolvedProvider,
        authType,
        credentialReference,
      });

      if (!response.ok) {
        setMessage(response.message || "Unable to register connector.");
        return;
      }

      setMessage(`✅ ${resolvedProvider} connector registered securely.`);
      setProvider("slack");
      setCustomProvider("");
      setCredentialReference("vault://");
      setTab("connectors");
      await refreshConnectors();
    } catch {
      setMessage("Error registering connector.");
    } finally {
      setActionLoading(null);
    }
  }

  // Update template defaults when authType changes
  useEffect(() => {
    setSelectedTemplate(0);
    const templates = CREDENTIAL_TEMPLATES[authType];
    if (templates?.[0]) {
      setCredentialReference(templates[0].prefix);
    }
  }, [authType]);

  const currentTemplates = CREDENTIAL_TEMPLATES[authType] ?? CREDENTIAL_TEMPLATES.api_key!;

  const connectors: ConnectorCardViewModel[] =
    connectorState.status === "ready" ? connectorState.connectors : [];
  const activeCount = connectors.filter((c) => c.status === "connected").length;
  const degradedCount = connectors.filter((c) => c.status === "degraded").length;
  const revokedCount = connectors.filter((c) => c.status === "revoked").length;

  return (
    <section className="integrations-root">
      {/* ── Header ── */}
      <div className="integrations-header">
        <div>
          <h1 className="title">Integrations</h1>
          <p className="muted">
            Manage connected services and ClosedSheath gateway instances.
          </p>
        </div>
        <button className="btn-refresh" onClick={refreshAll} title="Refresh all">
          ↻ Refresh
        </button>
      </div>

      {/* ── Summary stats ── */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-value">{connectors.length}</span>
          <span className="stat-label">Connectors</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: "#22c55e" }}>
            {activeCount}
          </span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: "#f59e0b" }}>
            {degradedCount}
          </span>
          <span className="stat-label">Degraded</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: "#ef4444" }}>
            {revokedCount}
          </span>
          <span className="stat-label">Revoked</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: connections?.status?.healthy ? "#22c55e" : "#f59e0b" }}>
            {connections?.status?.gatewaysOnline ?? gateways.length}/{connections?.status?.gatewaysTotal ?? gateways.length}
          </span>
          <span className="stat-label">Gateways Online</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: "#60a5fa" }}>
            {connections?.bindings?.length ?? 0}
          </span>
          <span className="stat-label">Bindings</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: "#8b5cf6" }}>
            {capabilities.length}
          </span>
          <span className="stat-label">Discovered</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: connections?.killSwitchesActive ? "#ef4444" : "#22c55e" }}>
            {connections?.killSwitchesActive ?? 0}
          </span>
          <span className="stat-label">Kill Switches</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${tab === "connectors" ? "active" : ""}`}
          onClick={() => setTab("connectors")}
        >
          Connectors
        </button>
        <button
          className={`tab-btn ${tab === "gateways" ? "active" : ""}`}
          onClick={() => {
            setTab("gateways");
            setShowGateways(false);
          }}
        >
          OpenClaw Gateways
        </button>
        <button
          className={`tab-btn add-btn ${tab === "add" ? "active" : ""}`}
          onClick={() => setTab("add")}
        >
          + Add Integration
        </button>
      </div>

      {/* ── Messages ── */}
      {message && (
        <div className="toast" onClick={() => setMessage(null)}>
          {message}
        </div>
      )}

      {/* ═══════════════ CONNECTORS TAB ═══════════════ */}
      {tab === "connectors" && (
        <div className="tab-content">
          <div className="demo-conn-section">
            <div className="demo-conn-header">
              <div>
                <h3 className="demo-conn-title">🔗 Demo Connections</h3>
                <span className="demo-conn-subtitle">Hardcoded for demo — Google Workspace, Twitter, Trello</span>
              </div>
              <span className="demo-conn-badge">CONNECTED</span>
            </div>
            <div className="demo-conn-grid">
              {DEMO_CONNECTIONS.map((conn) => (
                <div key={conn.id} className="demo-conn-card">
                  <div className="demo-conn-card-header">
                    <span className="demo-conn-icon">{conn.icon}</span>
                    <div>
                      <div className="demo-conn-name">{conn.name}</div>
                      <div className="demo-conn-note">{conn.note}</div>
                    </div>
                    <span className={`demo-conn-status ${conn.status}`}>{conn.status}</span>
                  </div>
                  <div className="demo-conn-scopes">
                    {conn.scopes.map((scope) => (
                      <span key={scope} className="demo-conn-scope">{scope}</span>
                    ))}
                  </div>
                  <div className="demo-conn-footer">
                    <span>Last sync: {conn.lastSync}</span>
                    <span className="demo-conn-pill">Secure</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* ── Auto-discovered OpenClaw Capabilities ── */}
          {(capabilities.length > 0 || capabilitiesLoading) && (
            <div className="discovered-section">
              <div className="discovered-header">
                <h3 className="discovered-title">🔍 Discovered from OpenClaw</h3>
                <span className="discovered-subtitle">
                  Auto-detected tools &amp; integrations from your connected agent
                </span>
              </div>
              {capabilitiesLoading && (
                <p className="muted" style={{ padding: "12px 0" }}>Discovering capabilities from OpenClaw agent…</p>
              )}
              {capabilitiesError && (
                <p className="muted" style={{ padding: "12px 0", color: "#f59e0b" }}>{capabilitiesError}</p>
              )}
              {!capabilitiesLoading && capabilities.length > 0 && (
                <>
                  <div className="capability-group">
                    <h4 className="cap-group-label">⚡ Tools</h4>
                    <div className="capability-grid">
                      {capabilities.filter(c => c.category === "tool").map((cap) => (
                        <div key={cap.name} className="capability-card">
                          <span className="cap-icon">{cap.icon}</span>
                          <div className="cap-info">
                            <span className="cap-name">{cap.name}</span>
                            <span className="cap-desc">{cap.description}</span>
                          </div>
                          <span className="cap-status">✓</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="capability-group">
                    <h4 className="cap-group-label">🔗 Integrations</h4>
                    <div className="capability-grid">
                      {capabilities.filter(c => c.category === "integration").map((cap) => (
                        <div key={cap.name} className="capability-card integration">
                          <span className="cap-icon">{cap.icon}</span>
                          <div className="cap-info">
                            <span className="cap-name">{cap.name}</span>
                            <span className="cap-desc">{cap.description}</span>
                          </div>
                          <span className="cap-status">✓</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Registered Connectors ── */}
          {connectorState.status === "loading" && (
            <p className="muted">Loading connectors...</p>
          )}
          {connectorState.status === "error" && (
            <p className="muted">Unable to load connectors. Check your session.</p>
          )}
          {connectorState.status === "empty" && capabilities.length === 0 && (
            <div className="empty-state">
              <p className="muted">No connectors configured yet.</p>
              <button className="btn-primary" onClick={() => setTab("add")}>
                + Add your first integration
              </button>
            </div>
          )}
          {connectorState.status === "ready" && (
            <div className="connector-grid">
              {connectors.map((c) => (
                <div
                  key={c.connectorId}
                  className={`connector-card ${c.status === "revoked" ? "revoked" : ""}`}
                >
                  <div className="connector-card-header">
                    <div className="connector-provider">
                      <span className="provider-icon">
                        {PROVIDER_PRESETS.find((p) => p.value === c.provider)?.icon ?? "🔌"}
                      </span>
                      <span className="provider-name">{c.provider}</span>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>

                  <div className="connector-meta">
                    <div className="meta-row">
                      <span className="meta-label">Auth</span>
                      <span className="meta-value">
                        {c.authType === "oauth" ? "OAuth 2.0" : "API Key"}
                      </span>
                    </div>
                    <div className="meta-row">
                      <span className="meta-label">Updated</span>
                      <TimeAgo iso={c.updatedAt} />
                    </div>
                    {c.lastErrorMessage && (
                      <div className="meta-row error-row">
                        <span className="meta-label">Error</span>
                        <span className="meta-value error-text">
                          {c.lastErrorMessage}
                        </span>
                      </div>
                    )}
                    <div className="meta-row">
                      <span className="meta-label">ID</span>
                      <span className="meta-value mono">
                        {c.connectorId.slice(0, 16)}…
                      </span>
                    </div>
                  </div>

                  <div className="connector-actions">
                    {c.status === "degraded" && (
                      <button
                        className="btn-sm btn-success"
                        disabled={actionLoading === c.connectorId}
                        onClick={() => handleReconnect(c.connectorId)}
                      >
                        {actionLoading === c.connectorId
                          ? "Reconnecting…"
                          : "↻ Reconnect"}
                      </button>
                    )}
                    {c.status !== "revoked" && (
                      <button
                        className="btn-sm btn-danger"
                        disabled={actionLoading === c.connectorId}
                        onClick={() => handleRevoke(c.connectorId)}
                      >
                        {confirmRevoke === c.connectorId
                          ? "Confirm Revoke?"
                          : actionLoading === c.connectorId
                            ? "Revoking…"
                            : "Revoke"}
                      </button>
                    )}
                    {c.status === "revoked" && (
                      <span className="muted-sm">
                        Revoked — credentials purged
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ GATEWAYS TAB ═══════════════ */}
      {tab === "gateways" && (
        <div className="tab-content">
          <div className="empty-state">
            <p className="muted">
              Gateways are hidden by default. Expand to review details if needed.
            </p>
            <button
              className="btn-primary"
              onClick={() => setShowGateways((current) => !current)}
            >
              {showGateways ? "Hide gateways" : "Show gateways"}
            </button>
          </div>
          {showGateways && (
            <>
              {gatewayLoading && <p className="muted">Fetching ClosedSheath gateways...</p>}
              {!gatewayLoading && gateways.length === 0 && (
                <div className="empty-state">
                  <p className="muted">No ClosedSheath gateway instances found.</p>
                  <p className="muted-sm">
                    Register a gateway via the ClosedSheath dashboard or POST to{" "}
                    <code>/openclaw/gateways</code>.
                  </p>
                </div>
              )}
              {!gatewayLoading && gateways.length > 0 && (
                <div className="connector-grid">
                  {gateways.map((gw) => (
                    <div key={gw.gatewayId} className="connector-card">
                      <div className="connector-card-header">
                        <div className="connector-provider">
                          <span className="provider-icon">🌐</span>
                          <span className="provider-name">
                            {gw.environment}
                          </span>
                        </div>
                        <GatewayStatusBadge status={gw.status} />
                      </div>

                      <div className="connector-meta">
                        <div className="meta-row">
                          <span className="meta-label">Host</span>
                          <span className="meta-value mono">{gw.host}:{gw.port}</span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-label">Base Path</span>
                          <span className="meta-value mono">{gw.basePath}</span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-label">Auth</span>
                          <span className="meta-value">{gw.authMode}</span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-label">Token Ref</span>
                          <span className="meta-value mono">
                            {gw.tokenRef.includes(":")
                              ? `${gw.tokenRef.split(":")[0]}:••••••`
                              : gw.tokenRef}
                          </span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-label">Loopback Only</span>
                          <span className="meta-value">{gw.loopbackOnly ? "Yes" : "No"}</span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-label">Gateway ID</span>
                          <span className="meta-value mono">
                            {gw.gatewayId.slice(0, 16)}…
                          </span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-label">Registered</span>
                          <TimeAgo iso={gw.createdAt} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════════ ADD TAB ═══════════════ */}
      {tab === "add" && (
        <div className="tab-content">
          <div className="add-section">
            <div className="security-banner">
              <span className="security-icon">🔒</span>
              <div>
                <strong>Secure Credential Handling</strong>
                <p className="muted-sm">
                  Credentials are stored as references to your secret manager (Vault,
                  AWS Secrets Manager, etc). Raw API keys are never accepted, stored, or
                  exposed to AI models.
                </p>
              </div>
            </div>

            <form onSubmit={handleRegister} className="add-form">
              {/* Provider selection */}
              <label className="field-label">Provider</label>
              <div className="provider-grid">
                {PROVIDER_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className={`provider-chip ${provider === p.value ? "selected" : ""}`}
                    onClick={() => setProvider(p.value)}
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
              {provider === "custom" && (
                <input
                  className="input"
                  value={customProvider}
                  onChange={(e) => setCustomProvider(e.target.value)}
                  placeholder="Enter provider name (e.g. salesforce)"
                />
              )}

              {/* Auth Type */}
              <label className="field-label">Authentication Type</label>
              <div className="auth-toggle">
                <button
                  type="button"
                  className={`toggle-btn ${authType === "oauth" ? "active" : ""}`}
                  onClick={() => setAuthType("oauth")}
                >
                  🔑 OAuth 2.0
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${authType === "api_key" ? "active" : ""}`}
                  onClick={() => setAuthType("api_key")}
                >
                  🗝️ API Key
                </button>
              </div>

              {/* Credential Reference */}
              <label className="field-label">Credential Reference</label>
              <div className="template-tabs">
                {currentTemplates.map((tpl, i) => (
                  <button
                    key={tpl.prefix}
                    type="button"
                    className={`template-tab ${selectedTemplate === i ? "active" : ""}`}
                    onClick={() => {
                      setSelectedTemplate(i);
                      setCredentialReference(tpl.prefix);
                    }}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
              <input
                className="input mono"
                value={credentialReference}
                onChange={(e) => setCredentialReference(e.target.value)}
                placeholder={currentTemplates[selectedTemplate]?.placeholder}
              />
              <p className="hint">
                {currentTemplates[selectedTemplate]?.hint}
              </p>

              <button
                className="btn-primary submit-btn"
                type="submit"
                disabled={actionLoading === "register"}
              >
                {actionLoading === "register"
                  ? "Registering…"
                  : "🔒 Register Securely"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .integrations-root {
          max-width: 960px;
          margin: 0 auto;
          padding: 24px 16px;
        }
        .integrations-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .integrations-header .title {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 4px;
        }
        .muted { color: #8b8fa3; margin: 0; font-size: 0.875rem; font-family: "Courier New", Courier, monospace; }
        .muted-sm { color: #8b8fa3; font-size: 0.78rem; font-family: "Courier New", Courier, monospace; }
        .mono { font-family: "JetBrains Mono", "Fira Code", monospace; font-size: 0.82rem; }
        .error-text { color: #ef4444; }

        /* Stats */
        .stats-row {
          display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;
        }
        .stat-card {
          flex: 1; min-width: 100px;
          background: #1a1c2e;
          border: 1px solid #2a2d42;
          border-radius: 10px;
          padding: 14px 16px;
          display: flex; flex-direction: column; align-items: center; gap: 2px;
        }
        .stat-value { font-size: 1.5rem; font-weight: 700; }
        .stat-label { font-size: 0.75rem; color: #8b8fa3; text-transform: uppercase; letter-spacing: 0.04em; }

        /* Tabs */
        .tab-bar {
          display: flex; gap: 4px;
          border-bottom: 1px solid #2a2d42;
          margin-bottom: 20px;
        }
        .tab-btn {
          padding: 10px 18px;
          background: none; border: none;
          color: #8b8fa3; cursor: pointer;
          border-bottom: 2px solid transparent;
          font-size: 0.875rem; font-weight: 500;
          transition: all 0.15s;
        }
        .tab-btn:hover { color: #c8cad8; }
        .tab-btn.active { color: #fff; border-bottom-color: #3b4eff; }
        .tab-btn.add-btn { margin-left: auto; color: #3b4eff; }
        .tab-btn.add-btn.active { color: #3b4eff; border-bottom-color: #3b4eff; }

        /* Toast */
        .toast {
          background: #1e2038;
          border: 1px solid #3b4eff44;
          color: #c8cad8;
          padding: 10px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 0.875rem;
          cursor: pointer;
        }

        /* Connector grid */
        .connector-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }
        .demo-conn-section {
          background: #13142a;
          border: 1px solid #2a2d42;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .demo-conn-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .demo-conn-title {
          font-size: 1rem;
          font-weight: 700;
          margin: 0 0 4px;
          color: #e0e2ee;
        }
        .demo-conn-subtitle {
          font-size: 0.78rem;
          color: #8b8fa3;
        }
        .demo-conn-badge {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          background: #22c55e1c;
          color: #22c55e;
        }
        .demo-conn-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 12px;
        }
        .demo-conn-card {
          background: #1a1c2e;
          border: 1px solid #2a2d42;
          border-radius: 12px;
          padding: 14px;
          transition: transform 0.15s ease, border-color 0.2s ease;
        }
        .demo-conn-card:hover {
          border-color: #3b4eff66;
          transform: translateY(-2px);
        }
        .demo-conn-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .demo-conn-icon {
          font-size: 1.4rem;
        }
        .demo-conn-name {
          font-weight: 600;
          font-size: 0.95rem;
          color: #e0e2ee;
        }
        .demo-conn-note {
          font-size: 0.75rem;
          color: #8b8fa3;
        }
        .demo-conn-status {
          margin-left: auto;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #22c55e;
        }
        .demo-conn-scopes {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }
        .demo-conn-scope {
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 0.7rem;
          background: #3b4eff12;
          color: #8da2ff;
        }
        .demo-conn-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.72rem;
          color: #8b8fa3;
        }
        .demo-conn-pill {
          padding: 2px 8px;
          border-radius: 999px;
          background: #22c55e12;
          color: #22c55e;
          font-weight: 600;
        }
        .connector-card {
          background: #1a1c2e;
          border: 1px solid #2a2d42;
          border-radius: 12px;
          padding: 18px;
          transition: border-color 0.2s;
        }
        .connector-card:hover { border-color: #3b4eff66; }
        .connector-card.revoked { opacity: 0.6; }
        .connector-card-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 14px;
        }
        .connector-provider {
          display: flex; align-items: center; gap: 8px;
        }
        .provider-icon { font-size: 1.3rem; }
        .provider-name { font-weight: 600; font-size: 1rem; text-transform: capitalize; }

        /* Status badge */
        .status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 0.75rem; font-weight: 600;
          padding: 3px 10px;
          border: 1px solid;
          border-radius: 20px;
        }
        .status-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          display: inline-block;
        }

        /* Meta */
        .connector-meta {
          display: flex; flex-direction: column; gap: 6px;
          margin-bottom: 14px;
        }
        .meta-row {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 0.82rem;
        }
        .meta-label { color: #8b8fa3; }
        .meta-value { color: #c8cad8; }
        .error-row { margin-top: 4px; }

        /* Actions */
        .connector-actions {
          display: flex; gap: 8px; flex-wrap: wrap;
          padding-top: 12px;
          border-top: 1px solid #2a2d42;
        }
        .btn-sm {
          padding: 5px 12px;
          border-radius: 6px;
          border: 1px solid;
          font-size: 0.78rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-success {
          background: #22c55e18;
          border-color: #22c55e44;
          color: #22c55e;
        }
        .btn-success:hover:not(:disabled) { background: #22c55e28; }
        .btn-danger {
          background: #ef444418;
          border-color: #ef444444;
          color: #ef4444;
        }
        .btn-danger:hover:not(:disabled) { background: #ef444428; }
        .btn-primary {
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          background: #3b4eff;
          color: #fff;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: background 0.15s;
        }
        .btn-primary:hover:not(:disabled) { background: #4f5fff; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-refresh {
          padding: 6px 14px;
          border-radius: 6px;
          border: 1px solid #2a2d42;
          background: #1a1c2e;
          color: #8b8fa3;
          cursor: pointer;
          font-size: 0.82rem;
        }
        .btn-refresh:hover { border-color: #3b4eff66; color: #c8cad8; }

        /* Empty state */
        .empty-state {
          text-align: center;
          padding: 40px 20px;
        }
        .empty-state .btn-primary { margin-top: 16px; }

        /* Add form */
        .add-section { max-width: 600px; }
        .security-banner {
          display: flex; gap: 12px; align-items: flex-start;
          background: #22c55e0c;
          border: 1px solid #22c55e22;
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 24px;
        }
        .security-icon { font-size: 1.5rem; }
        .security-banner strong { display: block; font-size: 0.9rem; margin-bottom: 4px; }
        .add-form { display: flex; flex-direction: column; gap: 14px; }
        .field-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #c8cad8;
          margin-bottom: -8px;
        }
        .input {
          padding: 9px 12px;
          border-radius: 8px;
          border: 1px solid #2a2d42;
          background: #12132200;
          color: #e0e2ee;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .input:focus { border-color: #3b4eff; }

        /* Provider grid */
        .provider-grid {
          display: flex; flex-wrap: wrap; gap: 8px;
        }
        .provider-chip {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px;
          border-radius: 8px;
          border: 1px solid #2a2d42;
          background: #1a1c2e;
          color: #c8cad8;
          cursor: pointer;
          font-size: 0.82rem;
          transition: all 0.15s;
        }
        .provider-chip:hover { border-color: #3b4eff66; }
        .provider-chip.selected {
          border-color: #3b4eff;
          background: #3b4eff18;
          color: #fff;
        }

        /* Auth toggle */
        .auth-toggle { display: flex; gap: 8px; }
        .toggle-btn {
          flex: 1;
          padding: 9px 14px;
          border-radius: 8px;
          border: 1px solid #2a2d42;
          background: #1a1c2e;
          color: #c8cad8;
          cursor: pointer;
          font-size: 0.82rem;
          transition: all 0.15s;
        }
        .toggle-btn.active {
          border-color: #3b4eff;
          background: #3b4eff18;
          color: #fff;
        }

        /* Template tabs */
        .template-tabs {
          display: flex; gap: 6px; flex-wrap: wrap;
        }
        .template-tab {
          padding: 5px 12px;
          border-radius: 6px;
          border: 1px solid #2a2d42;
          background: none;
          color: #8b8fa3;
          cursor: pointer;
          font-size: 0.75rem;
          transition: all 0.15s;
        }
        .template-tab.active {
          border-color: #3b4eff;
          color: #c8cad8;
          background: #3b4eff10;
        }
        .hint {
          font-size: 0.75rem;
          color: #8b8fa3;
          margin: -6px 0 0;
          line-height: 1.4;
        }
        .submit-btn { margin-top: 8px; }

        .tab-content { min-height: 200px; }

        /* Discovered capabilities */
        .discovered-section {
          background: #13142a;
          border: 1px solid #2a2d42;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .discovered-header {
          margin-bottom: 16px;
        }
        .discovered-title {
          font-size: 1rem;
          font-weight: 700;
          margin: 0 0 4px;
          color: #e0e2ee;
        }
        .discovered-subtitle {
          font-size: 0.78rem;
          color: #8b8fa3;
        }
        .capability-group {
          margin-bottom: 16px;
        }
        .capability-group:last-child {
          margin-bottom: 0;
        }
        .cap-group-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #8b8fa3;
          margin: 0 0 10px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .capability-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 10px;
        }
        .capability-card {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #1a1c2e;
          border: 1px solid #2a2d42;
          border-radius: 10px;
          padding: 12px 14px;
          transition: border-color 0.2s;
        }
        .capability-card:hover {
          border-color: #3b4eff44;
        }
        .capability-card.integration {
          border-left: 3px solid #8b5cf644;
        }
        .cap-icon {
          font-size: 1.3rem;
          flex-shrink: 0;
          width: 32px;
          text-align: center;
        }
        .cap-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }
        .cap-name {
          font-weight: 600;
          font-size: 0.88rem;
          color: #e0e2ee;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cap-desc {
          font-size: 0.75rem;
          color: #8b8fa3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cap-status {
          color: #22c55e;
          font-size: 0.9rem;
          font-weight: 700;
          flex-shrink: 0;
        }
      `}</style>
    </section>
  );
}
