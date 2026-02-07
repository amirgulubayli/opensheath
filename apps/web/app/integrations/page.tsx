"use client";

import { useEffect, useState } from "react";

import { listConnectors, registerConnector } from "../../src/lib/api-client";
import { getSession } from "../../src/lib/session";
import {
  mapConnectorsToDashboard,
  type ConnectorDashboardState,
} from "../../src/integration-automation-adapter";

export default function IntegrationsPage() {
  const [provider, setProvider] = useState("slack");
  const [authType, setAuthType] = useState<"oauth" | "api_key">("oauth");
  const [credentialReference, setCredentialReference] = useState("vault://demo");
  const [message, setMessage] = useState<string | null>(null);
  const [state, setState] = useState<ConnectorDashboardState | { status: "loading" }>(() => ({
    status: "loading",
  }));

  async function refresh() {
    const session = getSession();
    if (!session) {
      setState({ status: "error" });
      setMessage("Sign in required.");
      return;
    }

    const response = await listConnectors({
      sessionId: session.sessionId,
      workspaceId: session.workspaceId,
    });
    const mapped = mapConnectorsToDashboard(response);
    setState(mapped);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) {
      setMessage("Sign in required.");
      return;
    }

    const response = await registerConnector({
      sessionId: session.sessionId,
      provider,
      authType,
      credentialReference,
    });

    if (!response.ok) {
      setMessage(response.message || "Unable to register connector.");
      return;
    }

    setMessage("Connector registered.");
    await refresh();
  }

  return (
    <section className="card">
      <div className="title">Integrations</div>
      <p className="muted">Register and monitor connectors.</p>
      <form onSubmit={handleRegister} className="form">
        <input
          className="input"
          value={provider}
          onChange={(event) => setProvider(event.target.value)}
          placeholder="Provider"
        />
        <select className="input" value={authType} onChange={(e) => setAuthType(e.target.value as "oauth" | "api_key")}>
          <option value="oauth">oauth</option>
          <option value="api_key">api_key</option>
        </select>
        <input
          className="input"
          value={credentialReference}
          onChange={(event) => setCredentialReference(event.target.value)}
          placeholder="Credential reference"
        />
        <button className="button" type="submit">Register</button>
        {message ? <p className="muted">{message}</p> : null}
      </form>
      {state.status === "error" ? (
        <p className="muted">Unable to load connectors.</p>
      ) : state.status === "empty" ? (
        <p className="muted">No connectors configured.</p>
      ) : state.status === "ready" ? (
        <ul>
          {state.connectors.map((connector) => (
            <li key={connector.connectorId}>
              {connector.provider} · {connector.statusLabel} · {connector.authType}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Loading connectors...</p>
      )}
      <style>{`
        .form { display: grid; gap: 10px; margin-bottom: 18px; }
        .input { padding: 8px 10px; border-radius: 8px; border: 1px solid #d6d8e7; }
        .button { padding: 8px 10px; border-radius: 8px; border: none; background: #3b4eff; color: #fff; cursor: pointer; }
        ul { margin: 8px 0 0; padding-left: 18px; }
      `}</style>
    </section>
  );
}
