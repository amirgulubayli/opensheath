"use client";

import { useEffect, useState } from "react";

import {
  createAutomationRule,
  listAutomationRules,
  listAutomationRuns,
  listEventIngestion,
  publishAutomationEvent,
} from "../../src/lib/api-client";
import { getSession } from "../../src/lib/session";
import {
  mapAutomationRulesToState,
  mapAutomationRunsToState,
  mapEventIngestionToState,
  mapPublishEventResponse,
  type AutomationRuleState,
  type AutomationRunState,
  type EventIngestionState,
} from "../../src/integration-automation-adapter";

export default function AutomationPage() {
  const [eventType, setEventType] = useState("project.created");
  const [actionName, setActionName] = useState("notify.owner");
  const [maxRetries, setMaxRetries] = useState(3);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [rulesState, setRulesState] = useState<AutomationRuleState | { status: "loading" }>(() => ({
    status: "loading",
  }));
  const [runsState, setRunsState] = useState<AutomationRunState | { status: "loading" }>(() => ({
    status: "loading",
  }));
  const [eventsState, setEventsState] = useState<EventIngestionState | { status: "loading" }>(() => ({
    status: "loading",
  }));

  async function refresh() {
    const session = getSession();
    if (!session) {
      setRulesState({ status: "error" });
      setRunsState({ status: "error" });
      setEventsState({ status: "error" });
      return;
    }

    const [rulesResponse, runsResponse, eventsResponse] = await Promise.all([
      listAutomationRules({ sessionId: session.sessionId, workspaceId: session.workspaceId }),
      listAutomationRuns({ sessionId: session.sessionId, workspaceId: session.workspaceId }),
      listEventIngestion({ sessionId: session.sessionId, workspaceId: session.workspaceId }),
    ]);

    setRulesState(mapAutomationRulesToState(rulesResponse));
    setRunsState(mapAutomationRunsToState(runsResponse));
    setEventsState(mapEventIngestionToState(eventsResponse));
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleCreateRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) {
      setPublishMessage("Sign in required.");
      return;
    }

    const response = await createAutomationRule({
      sessionId: session.sessionId,
      eventType,
      actionName,
      maxRetries,
    });

    if (!response.ok) {
      setPublishMessage(response.message || "Unable to create rule.");
      return;
    }

    setPublishMessage("Rule created.");
    await refresh();
  }

  async function handlePublishEvent() {
    const session = getSession();
    if (!session) {
      setPublishMessage("Sign in required.");
      return;
    }

    const response = await publishAutomationEvent({
      sessionId: session.sessionId,
      eventType,
      sourceSystem: "ui",
      payload: {
        demo: true,
      },
    });
    const mapped = mapPublishEventResponse(response);
    setPublishMessage(mapped.message);
    await refresh();
  }

  return (
    <section className="card">
      <div className="title">Automation</div>
      <p className="muted">Create rules, publish events, and review runs.</p>
      <form onSubmit={handleCreateRule} className="form">
        <input className="input" value={eventType} onChange={(e) => setEventType(e.target.value)} />
        <input className="input" value={actionName} onChange={(e) => setActionName(e.target.value)} />
        <input
          className="input"
          type="number"
          value={maxRetries}
          onChange={(e) => setMaxRetries(Number(e.target.value))}
          min={1}
        />
        <button className="button" type="submit">Create rule</button>
      </form>
      <button className="button" type="button" onClick={handlePublishEvent}>
        Publish demo event
      </button>
      {publishMessage ? <p className="muted">{publishMessage}</p> : null}
      <div className="grid">
        <div className="card">
          <strong>Rules</strong>
          {rulesState.status === "ready" ? (
            <ul>
              {rulesState.rules.map((rule) => (
                <li key={rule.ruleId}>
                  {rule.eventType} → {rule.actionName} (max {rule.maxRetries})
                </li>
              ))}
            </ul>
          ) : rulesState.status === "empty" ? (
            <p className="muted">No automation rules configured.</p>
          ) : (
            <p className="muted">Loading rules...</p>
          )}
        </div>
        <div className="card">
          <strong>Runs</strong>
          {runsState.status === "ready" ? (
            <ul>
              {runsState.runs.map((run) => (
                <li key={run.runId}>
                  {run.ruleId} · {run.statusLabel} · {run.attempts} attempts
                </li>
              ))}
            </ul>
          ) : runsState.status === "empty" ? (
            <p className="muted">No runs recorded.</p>
          ) : (
            <p className="muted">Loading runs...</p>
          )}
        </div>
        <div className="card">
          <strong>Event ingestion</strong>
          {eventsState.status === "ready" ? (
            <ul>
              {eventsState.records.map((record) => (
                <li key={record.eventId}>
                  {record.eventType} · {record.ingestionLabel}
                </li>
              ))}
            </ul>
          ) : eventsState.status === "empty" ? (
            <p className="muted">No ingestion records.</p>
          ) : (
            <p className="muted">Loading ingestion records...</p>
          )}
        </div>
      </div>
      <style>{`
        .form { display: grid; gap: 10px; margin-bottom: 12px; }
        .input { padding: 8px 10px; border-radius: 8px; border: 1px solid #d6d8e7; }
        .button { padding: 8px 10px; border-radius: 8px; border: none; background: #3b4eff; color: #fff; cursor: pointer; margin-bottom: 10px; }
        ul { margin: 8px 0 0; padding-left: 18px; }
      `}</style>
    </section>
  );
}
