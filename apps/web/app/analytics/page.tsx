"use client";

import { useEffect, useState } from "react";

import { getUsageQuota, listAnalyticsEvents, listIntegrityAnomalies } from "../../src/lib/api-client";
import { getSession } from "../../src/lib/session";

export default function AnalyticsPage() {
  const [events, setEvents] = useState<string[]>([]);
  const [anomalies, setAnomalies] = useState<string[]>([]);
  const [quota, setQuota] = useState<string>("Loading...");

  useEffect(() => {
    const session = getSession();
    if (!session) {
      setEvents(["Sign in required."]);
      setAnomalies(["Sign in required."]);
      setQuota("Sign in required.");
      return;
    }

    async function load() {
      const [eventsResponse, anomaliesResponse, quotaResponse] = await Promise.all([
        listAnalyticsEvents({ sessionId: session.sessionId, workspaceId: session.workspaceId }),
        listIntegrityAnomalies({ sessionId: session.sessionId, workspaceId: session.workspaceId }),
        getUsageQuota({
          sessionId: session.sessionId,
          workspaceId: session.workspaceId,
          metric: "monthly_ai_actions",
        }),
      ]);

      if (eventsResponse.ok) {
        setEvents(
          eventsResponse.data.events.map(
            (event) => `${event.eventName} · ${event.entitlementSnapshot.entitlementStatus} · ${event.occurredAt}`,
          ),
        );
      } else {
        setEvents([eventsResponse.message || "Unable to load analytics events."]);
      }

      if (anomaliesResponse.ok) {
        setAnomalies(
          anomaliesResponse.data.anomalies.map(
            (anomaly) => `${anomaly.eventName} · ${anomaly.expectedPlanId} → ${anomaly.observedPlanId}`,
          ),
        );
      } else {
        setAnomalies([anomaliesResponse.message || "Unable to load integrity anomalies."]);
      }

      if (quotaResponse.ok) {
        const { allowed, remaining } = quotaResponse.data.quota;
        setQuota(allowed ? `Remaining ${remaining}` : "Quota exceeded");
      } else {
        setQuota(quotaResponse.message || "Unable to load quota.");
      }
    }

    void load();
  }, []);

  return (
    <section className="card">
      <div className="title">Analytics</div>
      <p className="muted">Usage safeguards and adoption events.</p>
      <div className="card">
        <strong>AI usage quota</strong>
        <p className="muted">{quota}</p>
      </div>
      <div className="grid">
        <div className="card">
          <strong>Analytics events</strong>
          <ul>
            {events.map((event) => (
              <li key={event}>{event}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <strong>Integrity anomalies</strong>
          <ul>
            {anomalies.map((anomaly) => (
              <li key={anomaly}>{anomaly}</li>
            ))}
          </ul>
        </div>
      </div>
      <style>{`
        .grid { display: grid; gap: 16px; }
        ul { margin: 8px 0 0; padding-left: 18px; }
      `}</style>
    </section>
  );
}
