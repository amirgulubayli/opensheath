"use client";

import { useEffect, useState } from "react";

import {
  listNotificationPreferences,
  updateNotificationPreference,
} from "../../src/lib/api-client";
import { getSession } from "../../src/lib/session";
import {
  mapNotificationPreferenceListResponse,
  mapNotificationPreferenceUpdateResponse,
  type NotificationPreferenceListState,
} from "../../src/notification-preferences-adapter";

export default function NotificationsPage() {
  const [email, setEmail] = useState(true);
  const [inApp, setInApp] = useState(true);
  const [webhook, setWebhook] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [state, setState] = useState<NotificationPreferenceListState | { status: "loading" }>(
    () => ({ status: "loading" }),
  );

  async function refresh() {
    const session = getSession();
    if (!session) {
      setState({ status: "error", message: "Sign in required." });
      return;
    }

    const response = await listNotificationPreferences({
      sessionId: session.sessionId,
      workspaceId: session.workspaceId,
    });
    const mapped = mapNotificationPreferenceListResponse(response);
    setState(mapped);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) {
      setMessage("Sign in required.");
      return;
    }

    const response = await updateNotificationPreference({
      sessionId: session.sessionId,
      email,
      inApp,
      webhook,
    });
    const mapped = mapNotificationPreferenceUpdateResponse(response);
    setMessage(mapped.message || "Preferences updated.");
    await refresh();
  }

  return (
    <section className="card">
      <div className="title">Notifications</div>
      <p className="muted">Manage notification preferences for the workspace.</p>
      <form onSubmit={handleUpdate} className="form">
        <label className="checkbox">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} />
          Email
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={inApp} onChange={(e) => setInApp(e.target.checked)} />
          In-app
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={webhook} onChange={(e) => setWebhook(e.target.checked)} />
          Webhook
        </label>
        <button className="button" type="submit">Update preferences</button>
      </form>
      {message ? <p className="muted">{message}</p> : null}
      <div className="card">
        <strong>Workspace preferences</strong>
        {state.status === "ready" ? (
          <ul>
            {state.preferences.map((pref) => (
              <li key={pref.userId}>
                {pref.userId} · {pref.channelSummary}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{state.message || "Loading preferences..."}</p>
        )}
      </div>
      <style>{`
        .form { display: grid; gap: 10px; margin-bottom: 18px; }
        .button { padding: 8px 10px; border-radius: 8px; border: none; background: #3b4eff; color: #fff; cursor: pointer; }
        .checkbox { display: flex; gap: 8px; align-items: center; font-size: 14px; }
        ul { margin: 8px 0 0; padding-left: 18px; }
      `}</style>
    </section>
  );
}
