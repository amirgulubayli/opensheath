"use client";

import { useState, useEffect, type FormEvent } from "react";
import type { SwarmRun, SwarmTask } from "../../../src/lib/openclaw-client";
import {
  listSwarmRuns,
  createSwarmRun,
  addSwarmTask,
  startSwarm,
  transitionSwarmTask,
  cancelSwarm,
} from "../../../src/lib/openclaw-client";

export default function SwarmPage() {
  const [runs, setRuns] = useState<SwarmRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddTask, setShowAddTask] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const refresh = async () => {
    const res = await listSwarmRuns();
    setRuns(res?.runs ?? []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const agentLines = (fd.get("agents") as string).trim().split("\n").filter(Boolean);
    const agents = agentLines.map((line) => {
      const parts = line.split(",").map((s) => s.trim());
      return { agentId: parts[0] ?? "unknown", role: parts[1] ?? "executor" };
    });
    await createSwarmRun({
      coordinatorAgentId: fd.get("coordinator") as string,
      agents,
      maxFanOut: Number(fd.get("maxFanOut")) || 3,
    });
    setShowCreate(false);
    setBusy(false);
    await refresh();
  };

  const handleAddTask = async (e: FormEvent<HTMLFormElement>, swarmRunId: string) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const deps = (fd.get("dependsOn") as string).trim().split(",").map((s) => s.trim()).filter(Boolean);
    const toolVal = (fd.get("toolName") as string);
    await addSwarmTask({
      swarmRunId,
      agentId: fd.get("agentId") as string,
      agentRole: fd.get("agentRole") as string,
      description: fd.get("description") as string,
      ...(toolVal ? { toolName: toolVal } : {}),
      ...(deps.length ? { dependsOn: deps } : {}),
    });
    setShowAddTask(null);
    setBusy(false);
    await refresh();
  };

  const handleStart = async (id: string) => {
    await startSwarm(id);
    await refresh();
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this swarm run?")) return;
    await cancelSwarm(id);
    await refresh();
  };

  const handleTransition = async (swarmRunId: string, taskId: string, status: string) => {
    await transitionSwarmTask({ swarmRunId, taskId, status });
    await refresh();
  };

  if (loading) return <Loading />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="title" style={{ margin: 0, fontSize: 24 }}>🐝 Swarm Orchestrator</h1>
        <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
          Multi-agent task execution with dependency graphs
        </p>
      </div>

      {/* Stats */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <StatCard label="Total Runs" value={runs.length} />
        <StatCard label="Running" value={runs.filter((r) => r.status === "running").length} color="#60a5fa" />
        <StatCard label="Completed" value={runs.filter((r) => r.status === "completed").length} color="#4ade80" />
        <StatCard label="Cancelled" value={runs.filter((r) => r.status === "cancelled").length} color="#f87171" />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setShowCreate(!showCreate)} style={actionBtn}>
          {showCreate ? "Cancel" : "+ Create Swarm"}
        </button>
      </div>

      {showCreate && (
        <form className="card" onSubmit={handleCreate} style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <input name="coordinator" placeholder="Coordinator agent ID" required />
          <input name="maxFanOut" type="number" placeholder="Max fan-out (default 3)" />
          <div style={{ gridColumn: "span 2" }}>
            <label className="muted" style={{ fontSize: 12, marginBottom: 4, display: "block" }}>
              Agents (one per line: agentId, role)
            </label>
            <textarea name="agents" rows={3} placeholder={"agent-1, executor\nagent-2, reviewer"} style={{ width: "100%", fontFamily: "monospace", fontSize: 13 }} required />
          </div>
          <button type="submit" disabled={busy} style={{ ...actionBtn, gridColumn: "span 2" }}>
            {busy ? "Creating…" : "Create Swarm Run"}
          </button>
        </form>
      )}

      {/* Runs list */}
      {runs.length === 0 ? (
        <div className="card muted" style={{ textAlign: "center", padding: 40 }}>No swarm runs yet</div>
      ) : runs.map((run) => (
        <div key={run.swarmRunId} className="card" style={{ border: `1px solid ${run.status === "running" ? "rgba(96,165,250,0.3)" : "rgba(255,255,255,0.06)"}` }}>
          {/* Run header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600 }}>
                {run.swarmRunId.slice(0, 20)}…
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                Coordinator: {run.coordinatorAgentId} · Fan-out: {run.currentFanOut}/{run.maxFanOut}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <SwarmStatus status={run.status} />
              {run.status === "pending" && <SmallBtn onClick={() => handleStart(run.swarmRunId)}>▶ Start</SmallBtn>}
              {(run.status === "pending" || run.status === "running") && <SmallBtn onClick={() => handleCancel(run.swarmRunId)} variant="error">✕ Cancel</SmallBtn>}
              <SmallBtn onClick={() => setShowAddTask(showAddTask === run.swarmRunId ? null : run.swarmRunId)}>+ Task</SmallBtn>
              <SmallBtn onClick={() => setExpandedRun(expandedRun === run.swarmRunId ? null : run.swarmRunId)}>
                {expandedRun === run.swarmRunId ? "▲" : "▼"} {run.tasks.length} tasks
              </SmallBtn>
            </div>
          </div>

          {/* Progress bar */}
          <ProgressBar completed={run.completedTasks} failed={run.failedTasks} total={run.totalTasks} />

          {/* Add task form */}
          {showAddTask === run.swarmRunId && (
            <form onSubmit={(e) => handleAddTask(e, run.swarmRunId)} style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(16,18,24,0.8)" }}>
              <input name="agentId" placeholder="Agent ID" required />
              <input name="agentRole" placeholder="Role (e.g. executor)" required />
              <input name="description" placeholder="Task description" required style={{ gridColumn: "span 2" }} />
              <input name="toolName" placeholder="Tool name (optional)" />
              <input name="dependsOn" placeholder="Depends on (comma-sep task IDs)" />
              <button type="submit" disabled={busy} style={{ ...actionBtn, gridColumn: "span 2" }}>
                {busy ? "Adding…" : "Add Task"}
              </button>
            </form>
          )}

          {/* Tasks table */}
          {expandedRun === run.swarmRunId && run.tasks.length > 0 && (
            <table style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Agent</th>
                  <th>Role</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Depends On</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {run.tasks.map((t) => (
                  <tr key={t.taskId}>
                    <td style={mono}>{t.taskId.slice(0, 12)}…</td>
                    <td>{t.agentId}</td>
                    <td>{t.agentRole}</td>
                    <td style={{ fontSize: 13 }}>{t.description}</td>
                    <td><TaskStatus status={t.status} /></td>
                    <td className="muted" style={{ fontSize: 12 }}>{t.dependsOn.length ? t.dependsOn.map((d) => d.slice(0, 8)).join(", ") : "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      {t.status === "running" && (
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <SmallBtn onClick={() => handleTransition(run.swarmRunId, t.taskId, "completed")}>✓</SmallBtn>
                          <SmallBtn onClick={() => handleTransition(run.swarmRunId, t.taskId, "failed")} variant="error">✕</SmallBtn>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
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

function SwarmStatus({ status }: { status: string }) {
  const c = status === "running" ? "#60a5fa" : status === "completed" ? "#4ade80" : status === "cancelled" ? "#f87171" : "#facc15";
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, background: `${c}22`, color: c, fontSize: 12, fontWeight: 600 }}>{status}</span>;
}

function TaskStatus({ status }: { status: string }) {
  const c = status === "completed" ? "#4ade80" : status === "running" ? "#60a5fa" : status === "failed" ? "#f87171" : "#9aa2b6";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, display: "inline-block" }} />
      {status}
    </span>
  );
}

function ProgressBar({ completed, failed, total }: { completed: number; failed: number; total: number }) {
  const pct = total === 0 ? 0 : ((completed + failed) / total) * 100;
  return (
    <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: failed > 0 ? "linear-gradient(90deg, #4ade80, #f87171)" : "#4ade80", transition: "width 0.3s" }} />
    </div>
  );
}

function SmallBtn({ onClick, children, variant }: { onClick: () => void; children: React.ReactNode; variant?: "error" }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px", fontSize: 12, borderRadius: 8,
        border: `1px solid ${variant === "error" ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.1)"}`,
        background: variant === "error" ? "rgba(248,113,113,0.1)" : "rgba(255,255,255,0.05)",
        color: variant === "error" ? "#f87171" : "#d3d8e6",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const mono: React.CSSProperties = { fontFamily: "monospace", fontSize: 13 };
const actionBtn: React.CSSProperties = {
  padding: "8px 16px", fontSize: 13, borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(96,165,250,0.12)", color: "#60a5fa",
  cursor: "pointer", fontWeight: 600,
};
