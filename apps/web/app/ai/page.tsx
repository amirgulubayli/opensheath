"use client";

import { useEffect, useState } from "react";

import { aiExecute, listAiRuns, listAiToolCalls } from "../../src/lib/api-client";
import { getSession } from "../../src/lib/session";
import { mapAiExecuteResponse } from "../../src/ai-action";

export default function AiPage() {
  const [toolName, setToolName] = useState("project.list");
  const [toolInput, setToolInput] = useState("{}");
  const [confirmHighRiskAction, setConfirmHighRiskAction] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [runs, setRuns] = useState<string[]>([]);
  const [toolCalls, setToolCalls] = useState<string[]>([]);

  async function refreshLists() {
    const session = getSession();
    if (!session) {
      setRuns(["Sign in required."]);
      setToolCalls(["Sign in required."]);
      return;
    }

    const [runsResponse, callsResponse] = await Promise.all([
      listAiRuns({ sessionId: session.sessionId, workspaceId: session.workspaceId }),
      listAiToolCalls({ sessionId: session.sessionId, workspaceId: session.workspaceId }),
    ]);

    if (runsResponse.ok) {
      setRuns(
        runsResponse.data.runs.map(
          (run) => `${run.runId} · ${run.status} · ${run.modelName}`,
        ),
      );
    } else {
      setRuns([runsResponse.message || "Unable to load AI runs."]);
    }

    if (callsResponse.ok) {
      setToolCalls(
        callsResponse.data.toolCalls.map(
          (call) => `${call.toolName} · ${call.status} · ${call.policyDecision}`,
        ),
      );
    } else {
      setToolCalls([callsResponse.message || "Unable to load tool calls."]);
    }
  }

  useEffect(() => {
    void refreshLists();
  }, []);

  async function handleExecute(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) {
      setMessage("Sign in required.");
      return;
    }

    let parsedInput: unknown = {};
    try {
      parsedInput = JSON.parse(toolInput || "{}");
    } catch {
      setMessage("Tool input must be valid JSON.");
      return;
    }

    const response = await aiExecute({
      sessionId: session.sessionId,
      toolName,
      toolInput: parsedInput,
      confirmHighRiskAction,
    });
    const result = mapAiExecuteResponse(response);
    setMessage(result.message);
    await refreshLists();
  }

  return (
    <section className="card">
      <div className="title">AI Actions</div>
      <p className="muted">Execute tools and review AI runs.</p>
      <form onSubmit={handleExecute} className="form">
        <input
          className="input"
          value={toolName}
          onChange={(event) => setToolName(event.target.value)}
          placeholder="Tool name"
        />
        <textarea
          className="textarea"
          value={toolInput}
          onChange={(event) => setToolInput(event.target.value)}
          rows={4}
        />
        <label className="checkbox">
          <input
            type="checkbox"
            checked={confirmHighRiskAction}
            onChange={(event) => setConfirmHighRiskAction(event.target.checked)}
          />
          Confirm high-risk action
        </label>
        <button className="button" type="submit">
          Execute
        </button>
        {message ? <p className="muted">{message}</p> : null}
      </form>
      <div className="grid">
        <div className="card">
          <strong>Runs</strong>
          <ul>
            {runs.map((run) => (
              <li key={run}>{run}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <strong>Tool Calls</strong>
          <ul>
            {toolCalls.map((call) => (
              <li key={call}>{call}</li>
            ))}
          </ul>
        </div>
      </div>
      <style>{`
        .form { display: grid; gap: 10px; margin-bottom: 18px; }
        .input, .textarea { padding: 8px 10px; border-radius: 8px; border: 1px solid #d6d8e7; }
        .button { padding: 8px 10px; border-radius: 8px; border: none; background: #3b4eff; color: #fff; cursor: pointer; }
        .checkbox { display: flex; gap: 8px; align-items: center; font-size: 14px; }
        ul { margin: 8px 0 0; padding-left: 18px; }
      `}</style>
    </section>
  );
}
