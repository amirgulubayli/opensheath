import { randomUUID } from "node:crypto";

export type ReleaseGate =
  | "architecture"
  | "ci_cd"
  | "auth_shell"
  | "tenant_isolation"
  | "core_workflow"
  | "discoverability"
  | "ai_action"
  | "ai_quality"
  | "automation"
  | "billing_sync"
  | "beta_readiness"
  | "ga_launch";

export interface GateEvidence {
  testsPassed: boolean;
  observabilityVerified: boolean;
  rollbackVerified: boolean;
  docsUpdated: boolean;
  notes?: string;
}

export interface AuthzRegressionResult {
  runId: string;
  suiteId: string;
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  startedAt: string;
  completedAt: string;
  ciRunUrl?: string;
  reportUrl?: string;
  notes?: string;
}

export interface AuthzRegressionInput {
  runId?: string;
  suiteId?: string;
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  startedAt?: string;
  completedAt?: string;
  ciRunUrl?: string;
  reportUrl?: string;
  notes?: string;
}

export interface ReleaseGateDashboardCheckStatus {
  required: boolean;
  present: boolean;
  passed: boolean;
  runId?: string;
  completedAt?: string;
  failedTests?: number;
}

export interface ReleaseGateDashboard {
  gate: ReleaseGate;
  ready: boolean;
  missing: string[];
  checks: {
    evidence: {
      testsPassed: boolean;
      observabilityVerified: boolean;
      rollbackVerified: boolean;
      docsUpdated: boolean;
    };
    authzRegression: ReleaseGateDashboardCheckStatus;
  };
}

export class ReleaseReadinessService {
  private readonly evidenceByGate = new Map<ReleaseGate, GateEvidence>();
  private readonly authzRegressionByGate = new Map<ReleaseGate, AuthzRegressionResult>();

  record(gate: ReleaseGate, evidence: GateEvidence): void {
    this.evidenceByGate.set(gate, evidence);
  }

  recordAuthzRegression(
    gate: ReleaseGate,
    input: AuthzRegressionInput,
  ): AuthzRegressionResult {
    const recorded: AuthzRegressionResult = {
      runId: input.runId ?? `authz_run_${randomUUID()}`,
      suiteId: input.suiteId ?? "authz_regression_suite",
      passed: input.passed,
      totalTests: input.totalTests,
      passedTests: input.passedTests,
      failedTests: input.failedTests,
      startedAt: input.startedAt ?? new Date().toISOString(),
      completedAt: input.completedAt ?? new Date().toISOString(),
      ...(input.ciRunUrl ? { ciRunUrl: input.ciRunUrl } : {}),
      ...(input.reportUrl ? { reportUrl: input.reportUrl } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    };

    this.authzRegressionByGate.set(gate, recorded);
    return recorded;
  }

  latestAuthzRegression(gate: ReleaseGate): AuthzRegressionResult | undefined {
    return this.authzRegressionByGate.get(gate);
  }

  evaluate(gate: ReleaseGate): {
    ready: boolean;
    missing: string[];
  } {
    const evidence = this.evidenceByGate.get(gate);

    if (!evidence) {
      return {
        ready: false,
        missing: ["testsPassed", "observabilityVerified", "rollbackVerified", "docsUpdated"],
      };
    }

    const missing: string[] = [];

    if (!evidence.testsPassed) {
      missing.push("testsPassed");
    }

    if (!evidence.observabilityVerified) {
      missing.push("observabilityVerified");
    }

    if (!evidence.rollbackVerified) {
      missing.push("rollbackVerified");
    }

    if (!evidence.docsUpdated) {
      missing.push("docsUpdated");
    }

    return {
      ready: missing.length === 0,
      missing,
    };
  }

  evaluateDashboard(gate: ReleaseGate): ReleaseGateDashboard {
    const base = this.evaluate(gate);
    const evidence = this.evidenceByGate.get(gate);
    const authz = this.latestAuthzRegression(gate);
    const authzRequired = gate === "tenant_isolation";

    const missing = [...base.missing];
    if (authzRequired) {
      if (!authz) {
        missing.push("authzRegressionRun");
      } else if (!authz.passed) {
        missing.push("authzRegressionPassed");
      }
    }

    return {
      gate,
      ready: missing.length === 0,
      missing,
      checks: {
        evidence: {
          testsPassed: evidence?.testsPassed ?? false,
          observabilityVerified: evidence?.observabilityVerified ?? false,
          rollbackVerified: evidence?.rollbackVerified ?? false,
          docsUpdated: evidence?.docsUpdated ?? false,
        },
        authzRegression: {
          required: authzRequired,
          present: Boolean(authz),
          passed: authz ? authz.passed : !authzRequired,
          ...(authz?.runId ? { runId: authz.runId } : {}),
          ...(authz?.completedAt ? { completedAt: authz.completedAt } : {}),
          ...(authz ? { failedTests: authz.failedTests } : {}),
        },
      },
    };
  }
}
