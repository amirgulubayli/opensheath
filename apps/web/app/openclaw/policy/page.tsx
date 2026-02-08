"use client";

import { useState, useEffect, type FormEvent } from "react";
import type { PolicyRule } from "../../../src/lib/openclaw-client";
import { listPolicyRules, addPolicyRule, evaluatePolicy } from "../../../src/lib/openclaw-client";

export default function PolicyPage() {
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  // Evaluate state
  const [evalTool, setEvalTool] = useState("");
  const [evalResult, setEvalResult] = useState<{ decision: string; matchedRuleId?: string } | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);

  const refresh = async () => {
    const res = await listPolicyRules();
    setRules(res?.rules ?? []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    await addPolicyRule({
      role: fd.get("role") as string,
      toolName: fd.get("toolName") as string,
      decision: fd.get("decision") as string,
    });
    setShowForm(false);
    setBusy(false);
    await refresh();
  };

  const handleEval = async () => {
    if (!evalTool.trim()) return;
    setEvalLoading(true);
    setEvalResult(null);
    const res = await evaluatePolicy({ toolName: evalTool });
    setEvalResult(res ?? null);
    setEvalLoading(false);
  };

  if (loading) return <Loading />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="title" style={{ margin: 0, fontSize: 24 }}>📋 Policy Engine</h1>
        <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
          Role-based access rules and real-time policy evaluation
        </p>
      </div>

      {/* Policy Evaluator */}
      <div className="card">
        <div className="title" style={{ fontSize: 16, marginBottom: 12 }}>Test Policy</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            placeholder="Tool name (e.g. list_sessions)"
            value={evalTool}
            onChange={(e) => setEvalTool(e.target.value)}
            style={{ flex: 1, maxWidth: 320 }}
          />
          <button onClick={handleEval} disabled={evalLoading} style={actionBtn}>
            {evalLoading ? "Evaluating…" : "Evaluate"}
          </button>
        </div>
        {evalResult && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: evalResult.decision === "allow" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", border: `1px solid ${evalResult.decision === "allow" ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}` }}>
            <span style={{ fontWeight: 600, color: evalResult.decision === "allow" ? "#4ade80" : "#f87171" }}>
              {evalResult.decision.toUpperCase()}
            </span>
            {evalResult.matchedRuleId && (
              <span className="muted" style={{ marginLeft: 12, fontSize: 12 }}>
                Matched: {evalResult.matchedRuleId.slice(0, 16)}…
              </span>
            )}
          </div>
        )}
      </div>

      {/* Add rule */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>
          Rules ({rules.length})
        </div>
        <button onClick={() => setShowForm(!showForm)} style={actionBtn}>
          {showForm ? "Cancel" : "+ Add Rule"}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={handleAdd} style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <input name="role" placeholder="Role (e.g. operator)" required />
          <input name="toolName" placeholder="Tool name (e.g. list_sessions)" required />
          <select name="decision" required>
            <option value="allow">Allow</option>
            <option value="deny">Deny</option>
            <option value="require_approval">Require Approval</option>
          </select>
          <button type="submit" disabled={busy} style={actionBtn}>
            {busy ? "Adding…" : "Add Rule"}
          </button>
        </form>
      )}

      {/* Rules table */}
      <table>
        <thead>
          <tr>
            <th>Rule ID</th>
            <th>Workspace</th>
            <th>Role</th>
            <th>Tool</th>
            <th>Decision</th>
            <th>Version</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {rules.length === 0 ? (
            <tr><td colSpan={7} className="muted" style={{ textAlign: "center", padding: 32 }}>No policy rules defined</td></tr>
          ) : rules.map((r) => (
            <tr key={r.ruleId}>
              <td style={mono}>{r.ruleId.slice(0, 14)}…</td>
              <td>{r.workspaceId}</td>
              <td>{r.role}</td>
              <td style={mono}>{r.toolName}</td>
              <td><DecisionBadge decision={r.decision} /></td>
              <td className="muted">v{r.ruleVersion}</td>
              <td className="muted" style={{ fontSize: 12 }}>{new Date(r.createdAt).toLocaleDateString()}</td>
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

function DecisionBadge({ decision }: { decision: string }) {
  const c = decision === "allow" ? "#4ade80" : decision === "deny" ? "#f87171" : "#facc15";
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, background: `${c}22`, color: c, fontSize: 12, fontWeight: 600 }}>{decision}</span>;
}

const mono: React.CSSProperties = { fontFamily: "monospace", fontSize: 13 };
const actionBtn: React.CSSProperties = {
  padding: "8px 16px", fontSize: 13, borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(96,165,250,0.12)", color: "#60a5fa",
  cursor: "pointer", fontWeight: 600,
};
