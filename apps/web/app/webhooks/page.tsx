"use client";

import { useEffect, useState } from "react";

import { listWebhookDeliveries, replayWebhookDelivery } from "../../src/lib/api-client";
import { getSession } from "../../src/lib/session";
import {
  mapWebhookDeliveriesToState,
  mapWebhookDeliveryMutationResponse,
  type WebhookDeliveryListState,
} from "../../src/webhook-delivery-adapter";

export default function WebhooksPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [state, setState] = useState<WebhookDeliveryListState | { status: "loading" }>(() => ({
    status: "loading",
  }));

  async function refresh() {
    const session = getSession();
    if (!session) {
      setState({ status: "error" });
      setMessage("Sign in required.");
      return;
    }

    const response = await listWebhookDeliveries({
      sessionId: session.sessionId,
      workspaceId: session.workspaceId,
    });
    const mapped = mapWebhookDeliveriesToState(response);
    setState(mapped);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleReplay(deliveryId: string) {
    const session = getSession();
    if (!session) {
      setMessage("Sign in required.");
      return;
    }

    const response = await replayWebhookDelivery({
      sessionId: session.sessionId,
      deliveryId,
    });
    const mapped = mapWebhookDeliveryMutationResponse(response);
    setMessage(mapped.message);
    await refresh();
  }

  return (
    <section className="card">
      <div className="title">Outbound Webhooks</div>
      <p className="muted">Review deliveries and replay failures.</p>
      {message ? <p className="muted">{message}</p> : null}
      {state.status === "ready" ? (
        <ul>
          {state.deliveries.map((delivery) => (
            <li key={delivery.deliveryId}>
              {delivery.eventType} · {delivery.statusLabel}
              {delivery.canReplay ? (
                <button className="link" onClick={() => handleReplay(delivery.deliveryId)}>
                  Replay
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : state.status === "empty" ? (
        <p className="muted">No webhook deliveries found.</p>
      ) : (
        <p className="muted">Loading deliveries...</p>
      )}
      <style>{`
        ul { margin: 8px 0 0; padding-left: 18px; }
        .link { margin-left: 8px; background: none; border: none; color: #3b4eff; cursor: pointer; }
      `}</style>
    </section>
  );
}
