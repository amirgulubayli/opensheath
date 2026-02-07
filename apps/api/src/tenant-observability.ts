import type { ApiErrorCode } from "@ethoxford/contracts";

export interface TenantDashboardNames {
  isolation: string;
  workspaceLifecycle: string;
  membershipSecurity: string;
}

export interface TenantPathMetricSnapshot {
  key: string;
  method: string;
  path: string;
  count: number;
  deniedCount: number;
  authDeniedCount: number;
  policyDeniedCount: number;
  crossTenantDeniedCount: number;
  roleDeniedCount: number;
}

interface TenantPathMetricAccumulator {
  method: string;
  path: string;
  count: number;
  deniedCount: number;
  authDeniedCount: number;
  policyDeniedCount: number;
  crossTenantDeniedCount: number;
  roleDeniedCount: number;
}

interface TenantTotalsAccumulator {
  tenantRequestCount: number;
  deniedCount: number;
  authDeniedCount: number;
  policyDeniedCount: number;
  crossTenantDeniedCount: number;
  roleDeniedCount: number;
  workspaceLifecycleRequestCount: number;
  workspaceLifecycleDeniedCount: number;
  membershipDeniedCount: number;
}

export interface TenantTotalsSnapshot {
  tenantRequestCount: number;
  deniedCount: number;
  authDeniedCount: number;
  policyDeniedCount: number;
  crossTenantDeniedCount: number;
  roleDeniedCount: number;
  unauthorizedTenantRate: number;
  workspaceLifecycleRequestCount: number;
  workspaceLifecycleDeniedCount: number;
  workspaceLifecycleAnomalyRate: number;
  membershipDeniedCount: number;
}

export interface TenantIsolationMetricsSnapshot {
  generatedAt: string;
  dashboardNames: TenantDashboardNames;
  totals: TenantTotalsSnapshot;
  paths: TenantPathMetricSnapshot[];
}

export interface TenantAlertThresholds {
  minTenantRequestCount: number;
  p1CrossTenantDeniedCount: number;
  p2UnauthorizedTenantRate: number;
  p2WorkspaceLifecycleAnomalyRate: number;
  p2MembershipDeniedCount: number;
}

export type TenantAlertSeverity = "p1" | "p2";

export interface TenantIsolationAlert {
  code:
    | "cross_tenant_denial_detected"
    | "unauthorized_tenant_rate_high"
    | "workspace_lifecycle_anomaly_rate_high"
    | "membership_denial_spike";
  severity: TenantAlertSeverity;
  value: number;
  threshold: number;
  dashboard: string;
  message: string;
  runbook: string;
}

export interface TenantAlertEvaluation {
  generatedAt: string;
  thresholds: TenantAlertThresholds;
  snapshot: TenantIsolationMetricsSnapshot;
  alerts: TenantIsolationAlert[];
}

export const TENANT_ISOLATION_RUNBOOK_PATH =
  "docs/07-role-sprint-plans/sprint-03-tenant-authorization/devops-sre-engineer/sprint-03-tenant-isolation-operations-checklist.md";

export const DEFAULT_TENANT_DASHBOARD_NAMES: TenantDashboardNames = {
  isolation: "tenant-isolation-access-v1",
  workspaceLifecycle: "tenant-workspace-lifecycle-v1",
  membershipSecurity: "tenant-membership-security-v1",
};

export const DEFAULT_TENANT_ALERT_THRESHOLDS: TenantAlertThresholds = {
  minTenantRequestCount: 10,
  p1CrossTenantDeniedCount: 1,
  p2UnauthorizedTenantRate: 0.2,
  p2WorkspaceLifecycleAnomalyRate: 0.2,
  p2MembershipDeniedCount: 5,
};

function round(value: number, precision = 4): number {
  return Number(value.toFixed(precision));
}

function rate(value: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return value / total;
}

function isTenantPath(path: string): boolean {
  return (
    path.startsWith("/workspaces/") ||
    path.startsWith("/projects/") ||
    path.startsWith("/documents/") ||
    path.startsWith("/retrieval/") ||
    path.startsWith("/ai/")
  );
}

function isWorkspaceLifecyclePath(path: string): boolean {
  return path.startsWith("/workspaces/");
}

function isMembershipPath(path: string): boolean {
  return (
    path === "/workspaces/invite" ||
    path === "/workspaces/accept-invite" ||
    path === "/workspaces/members"
  );
}

function isDenied(statusCode: number): boolean {
  return statusCode === 401 || statusCode === 403;
}

type TenantObservabilityErrorCode = ApiErrorCode | "unknown_error" | undefined;

function isCrossTenantDenied(
  errorCode: TenantObservabilityErrorCode,
  errorMessage: string | undefined,
): boolean {
  return (
    errorCode === "policy_denied" &&
    (errorMessage ?? "").toLowerCase().includes("workspace mismatch")
  );
}

function isRoleDenied(
  errorCode: TenantObservabilityErrorCode,
  errorMessage: string | undefined,
): boolean {
  if (errorCode !== "policy_denied") {
    return false;
  }

  const normalized = (errorMessage ?? "").toLowerCase();
  return normalized.includes("insufficient permission") || normalized.includes("not a workspace member");
}

function sortByPath(a: TenantPathMetricSnapshot, b: TenantPathMetricSnapshot): number {
  if (a.path === b.path) {
    return a.method.localeCompare(b.method);
  }
  return a.path.localeCompare(b.path);
}

export class InMemoryTenantIsolationMetrics {
  private readonly byPath = new Map<string, TenantPathMetricAccumulator>();
  private readonly totals: TenantTotalsAccumulator = {
    tenantRequestCount: 0,
    deniedCount: 0,
    authDeniedCount: 0,
    policyDeniedCount: 0,
    crossTenantDeniedCount: 0,
    roleDeniedCount: 0,
    workspaceLifecycleRequestCount: 0,
    workspaceLifecycleDeniedCount: 0,
    membershipDeniedCount: 0,
  };

  constructor(private readonly dashboardNames: TenantDashboardNames = DEFAULT_TENANT_DASHBOARD_NAMES) {}

  record(input: {
    method: string;
    path: string;
    statusCode: number;
    errorCode?: ApiErrorCode | "unknown_error";
    errorMessage?: string;
  }): void {
    if (!isTenantPath(input.path)) {
      return;
    }

    const key = `${input.method} ${input.path}`;
    const existing = this.byPath.get(key);
    const next: TenantPathMetricAccumulator = existing ?? {
      method: input.method,
      path: input.path,
      count: 0,
      deniedCount: 0,
      authDeniedCount: 0,
      policyDeniedCount: 0,
      crossTenantDeniedCount: 0,
      roleDeniedCount: 0,
    };

    next.count += 1;
    this.totals.tenantRequestCount += 1;

    if (isWorkspaceLifecyclePath(input.path)) {
      this.totals.workspaceLifecycleRequestCount += 1;
      if (input.statusCode >= 400) {
        this.totals.workspaceLifecycleDeniedCount += 1;
      }
    }

    if (isDenied(input.statusCode)) {
      next.deniedCount += 1;
      this.totals.deniedCount += 1;

      if (input.errorCode === "auth_denied") {
        next.authDeniedCount += 1;
        this.totals.authDeniedCount += 1;
      }

      if (input.errorCode === "policy_denied") {
        next.policyDeniedCount += 1;
        this.totals.policyDeniedCount += 1;
      }

      if (isCrossTenantDenied(input.errorCode, input.errorMessage)) {
        next.crossTenantDeniedCount += 1;
        this.totals.crossTenantDeniedCount += 1;
      }

      if (isRoleDenied(input.errorCode, input.errorMessage)) {
        next.roleDeniedCount += 1;
        this.totals.roleDeniedCount += 1;
      }

      if (isMembershipPath(input.path)) {
        this.totals.membershipDeniedCount += 1;
      }
    }

    this.byPath.set(key, next);
  }

  snapshot(): TenantIsolationMetricsSnapshot {
    const paths = Array.from(this.byPath.entries()).map(([key, value]) => ({
      key,
      method: value.method,
      path: value.path,
      count: value.count,
      deniedCount: value.deniedCount,
      authDeniedCount: value.authDeniedCount,
      policyDeniedCount: value.policyDeniedCount,
      crossTenantDeniedCount: value.crossTenantDeniedCount,
      roleDeniedCount: value.roleDeniedCount,
    }));

    paths.sort(sortByPath);

    const unauthorizedTenantRate = round(
      rate(this.totals.deniedCount, this.totals.tenantRequestCount),
    );
    const workspaceLifecycleAnomalyRate = round(
      rate(
        this.totals.workspaceLifecycleDeniedCount,
        this.totals.workspaceLifecycleRequestCount,
      ),
    );

    return {
      generatedAt: new Date().toISOString(),
      dashboardNames: this.dashboardNames,
      totals: {
        ...this.totals,
        unauthorizedTenantRate,
        workspaceLifecycleAnomalyRate,
      },
      paths,
    };
  }
}

export function evaluateTenantIsolationAlerts(
  snapshot: TenantIsolationMetricsSnapshot,
  thresholds: TenantAlertThresholds = DEFAULT_TENANT_ALERT_THRESHOLDS,
): TenantAlertEvaluation {
  const alerts: TenantIsolationAlert[] = [];
  const totals = snapshot.totals;

  if (totals.crossTenantDeniedCount >= thresholds.p1CrossTenantDeniedCount) {
    alerts.push({
      code: "cross_tenant_denial_detected",
      severity: "p1",
      value: totals.crossTenantDeniedCount,
      threshold: thresholds.p1CrossTenantDeniedCount,
      dashboard: snapshot.dashboardNames.isolation,
      message: "Cross-tenant denial detected in tenant-sensitive paths",
      runbook: TENANT_ISOLATION_RUNBOOK_PATH,
    });
  }

  if (
    totals.tenantRequestCount >= thresholds.minTenantRequestCount &&
    totals.unauthorizedTenantRate >= thresholds.p2UnauthorizedTenantRate
  ) {
    alerts.push({
      code: "unauthorized_tenant_rate_high",
      severity: "p2",
      value: totals.unauthorizedTenantRate,
      threshold: thresholds.p2UnauthorizedTenantRate,
      dashboard: snapshot.dashboardNames.isolation,
      message: "Unauthorized tenant-path request rate exceeded threshold",
      runbook: TENANT_ISOLATION_RUNBOOK_PATH,
    });
  }

  if (
    totals.workspaceLifecycleRequestCount > 0 &&
    totals.workspaceLifecycleAnomalyRate >= thresholds.p2WorkspaceLifecycleAnomalyRate
  ) {
    alerts.push({
      code: "workspace_lifecycle_anomaly_rate_high",
      severity: "p2",
      value: totals.workspaceLifecycleAnomalyRate,
      threshold: thresholds.p2WorkspaceLifecycleAnomalyRate,
      dashboard: snapshot.dashboardNames.workspaceLifecycle,
      message: "Workspace lifecycle anomaly rate exceeded threshold",
      runbook: TENANT_ISOLATION_RUNBOOK_PATH,
    });
  }

  if (totals.membershipDeniedCount >= thresholds.p2MembershipDeniedCount) {
    alerts.push({
      code: "membership_denial_spike",
      severity: "p2",
      value: totals.membershipDeniedCount,
      threshold: thresholds.p2MembershipDeniedCount,
      dashboard: snapshot.dashboardNames.membershipSecurity,
      message: "Membership denial count exceeded threshold",
      runbook: TENANT_ISOLATION_RUNBOOK_PATH,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    thresholds,
    snapshot,
    alerts,
  };
}
