/**
 * Global Orchestrator Store
 *
 * Persists task runs, chat messages, security checks, and session history
 * in localStorage so state survives page navigations.
 */

/* ─── Types ─── */

export interface SecurityCheck {
  id: string;
  label: string;
  status: "pending" | "pass" | "fail";
  timestamp: number;
}

export interface AgentRequest {
  id: string;
  agentId: string;
  tool: string;
  status: "pending" | "running" | "completed" | "failed";
  policyDecision?: string;
  riskTier?: number;
  durationMs?: number;
  httpStatus?: number;
  responseSummary?: string;
  securityChecks: SecurityCheck[];
  startedAt: number;
  completedAt?: number;
}

export interface TaskDecomposition {
  id: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  agentRequests: AgentRequest[];
  error?: string;
  startedAt: number;
  completedAt?: number;
}

export interface RunSession {
  runId: string;
  userMessage: string;
  strategy: "single" | "decomposed";
  status: "pending" | "running" | "completed" | "failed";
  tasks: TaskDecomposition[];
  reply?: string;
  totalDurationMs?: number;
  createdAt: number;
  completedAt?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "system";
  content: string;
  timestamp: number;
  runId?: string; // link to RunSession
  meta?: {
    tool?: string;
    status?: string;
    durationMs?: number;
    policyDecision?: string;
    riskTier?: number;
  };
}

export interface OrchestratorState {
  messages: ChatMessage[];
  activeRuns: RunSession[];
  sessionHistory: RunSession[];
  lastUpdated: number;
}

const STORE_KEY = "closedsheath.orchestrator";
const MAX_HISTORY = 100;

/* ─── Read / Write ─── */

function readStore(): OrchestratorState {
  if (typeof window === "undefined") {
    return defaultState();
  }
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    return JSON.parse(raw) as OrchestratorState;
  } catch {
    return defaultState();
  }
}

function writeStore(state: OrchestratorState) {
  if (typeof window === "undefined") return;
  state.lastUpdated = Date.now();
  // Trim history
  if (state.sessionHistory.length > MAX_HISTORY) {
    state.sessionHistory = state.sessionHistory.slice(-MAX_HISTORY);
  }
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // storage full — remove old history
    state.sessionHistory = state.sessionHistory.slice(-20);
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch { /* give up */ }
  }
}

function defaultState(): OrchestratorState {
  return {
    messages: [
      {
        id: "welcome",
        role: "system",
        content:
          "Hey! I'm your ClosedSheath operator. Everything here is relayed to OpenClaw — I don't run any tools myself, I just decompose your requests and fire concurrent calls to the agent.\n\n• Type anything → relayed to OpenClaw agent\n• Multi-part requests → auto-decomposed & run in parallel\n• \"gateways\" → connection status\n• \"metrics\" → system stats\n• \"run <tool>\" → direct tool invocation via gateway",
        timestamp: Date.now(),
      },
    ],
    activeRuns: [],
    sessionHistory: [],
    lastUpdated: Date.now(),
  };
}

/* ─── Public API ─── */

export function getOrchestratorState(): OrchestratorState {
  return readStore();
}

export function addMessage(msg: ChatMessage): OrchestratorState {
  const state = readStore();
  state.messages.push(msg);
  // Keep only last 200 messages in active chat
  if (state.messages.length > 200) {
    state.messages = state.messages.slice(-200);
  }
  writeStore(state);
  return state;
}

export function getMessages(): ChatMessage[] {
  return readStore().messages;
}

export function clearMessages(): void {
  const state = readStore();
  state.messages = [defaultState().messages[0]!];
  writeStore(state);
}

/* ─── Run Management ─── */

export function createRun(userMessage: string): RunSession {
  const run: RunSession = {
    runId: `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userMessage,
    strategy: "single",
    status: "pending",
    tasks: [],
    createdAt: Date.now(),
  };
  const state = readStore();
  state.activeRuns.push(run);
  writeStore(state);
  return run;
}

export function updateRun(runId: string, updates: Partial<RunSession>): RunSession | null {
  const state = readStore();
  const idx = state.activeRuns.findIndex((r) => r.runId === runId);
  if (idx === -1) return null;
  const run = { ...state.activeRuns[idx]!, ...updates };
  state.activeRuns[idx] = run;

  // If completed/failed, move to history
  if (run.status === "completed" || run.status === "failed") {
    run.completedAt = Date.now();
    state.sessionHistory.push(run);
    state.activeRuns.splice(idx, 1);
  }

  writeStore(state);
  return run;
}

export function getActiveRuns(): RunSession[] {
  return readStore().activeRuns;
}

export function getSessionHistory(): RunSession[] {
  return readStore().sessionHistory;
}

export function deleteHistoryEntry(runId: string): void {
  const state = readStore();
  state.sessionHistory = state.sessionHistory.filter((r) => r.runId !== runId);
  writeStore(state);
}

export function clearHistory(): void {
  const state = readStore();
  state.sessionHistory = [];
  writeStore(state);
}

/* ─── Security Checks Generator ─── */

export function generateSecurityChecks(tool: string, riskTier: number): SecurityCheck[] {
  const checks: SecurityCheck[] = [
    { id: `sc_auth_${Date.now()}`, label: "Authentication", status: "pending", timestamp: Date.now() },
    { id: `sc_rbac_${Date.now()}`, label: "RBAC Authorization", status: "pending", timestamp: Date.now() },
    { id: `sc_policy_${Date.now()}`, label: "Policy Evaluation", status: "pending", timestamp: Date.now() },
    { id: `sc_rate_${Date.now()}`, label: "Rate Limiting", status: "pending", timestamp: Date.now() },
    { id: `sc_risk_${Date.now()}`, label: `Risk Assessment (T${riskTier})`, status: "pending", timestamp: Date.now() },
  ];
  if (riskTier >= 2) {
    checks.push({ id: `sc_approval_${Date.now()}`, label: "Approval Gate", status: "pending", timestamp: Date.now() });
  }
  checks.push(
    { id: `sc_audit_${Date.now()}`, label: "Audit Trail", status: "pending", timestamp: Date.now() },
    { id: `sc_ks_${Date.now()}`, label: "Kill Switch Check", status: "pending", timestamp: Date.now() },
  );
  return checks;
}

/* ─── Helpers ─── */

export function makeMessageId(prefix: string = "m"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function makeSysMessage(content: string, runId?: string): ChatMessage {
  return {
    id: makeMessageId("s"),
    role: "system",
    content,
    timestamp: Date.now(),
    runId,
  };
}

export function makeUserMessage(content: string): ChatMessage {
  return {
    id: makeMessageId("u"),
    role: "user",
    content,
    timestamp: Date.now(),
  };
}
