import type { ApiErrorCode } from "@ethoxford/contracts";

export type LogSeverity = "debug" | "info" | "warn" | "error";

export interface LogContext {
  event: string;
  severity?: LogSeverity;
  requestId?: string;
  correlationId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  workspaceId?: string;
  actorId?: string;
  sessionId?: string;
  authMethod?: string;
  requestTimestamp?: string;
  errorCode?: ApiErrorCode | "unknown_error";
  errorMessage?: string;
  denialClass?: "auth_denied" | "policy_denied";
  targetResource?: string;
}

export interface RouteMetricSnapshot {
  key: string;
  method: string;
  path: string;
  count: number;
  errorCount: number;
  totalDurationMs: number;
  averageDurationMs: number;
  statusCodeCounts: Record<string, number>;
  errorCodeCounts: Record<string, number>;
}

interface RouteMetricAccumulator {
  method: string;
  path: string;
  count: number;
  errorCount: number;
  totalDurationMs: number;
  statusCodeCounts: Map<string, number>;
  errorCodeCounts: Map<string, number>;
}

interface GlobalMetricAccumulator {
  requestCount: number;
  errorCount: number;
  totalDurationMs: number;
  statusCodeCounts: Map<string, number>;
  errorCodeCounts: Map<string, number>;
}

interface AuthMetricAccumulator {
  requestCount: number;
  successCount: number;
  failureCount: number;
  unauthorizedAttemptCount: number;
}

export interface AuthMetricsSnapshot {
  requestCount: number;
  successCount: number;
  failureCount: number;
  unauthorizedAttemptCount: number;
}

export interface MetricsTotalsSnapshot {
  requestCount: number;
  errorCount: number;
  totalDurationMs: number;
  averageDurationMs: number;
  statusCodeCounts: Record<string, number>;
  errorCodeCounts: Record<string, number>;
  auth: AuthMetricsSnapshot;
}

export interface MetricsSnapshot {
  service: string;
  generatedAt: string;
  routes: RouteMetricSnapshot[];
  totals: MetricsTotalsSnapshot;
}

function sortByRoute(a: RouteMetricSnapshot, b: RouteMetricSnapshot): number {
  if (a.path === b.path) {
    return a.method.localeCompare(b.method);
  }
  return a.path.localeCompare(b.path);
}

function toCounterSnapshot(counter: Map<string, number>): Record<string, number> {
  return Object.fromEntries(Array.from(counter.entries()).sort(([a], [b]) => a.localeCompare(b)));
}

function incrementCounter(counter: Map<string, number>, key: string): void {
  const next = (counter.get(key) ?? 0) + 1;
  counter.set(key, next);
}

function defaultSeverityForEvent(event: string): LogSeverity {
  if (event.endsWith("error")) {
    return "error";
  }

  if (event.includes("denied")) {
    return "warn";
  }

  return "info";
}

function isAuthPath(path: string): boolean {
  return path === "/auth" || path.startsWith("/auth/");
}

export class StructuredLogger {
  constructor(
    private readonly service: string,
    private readonly write: (line: string) => void = (line) => console.log(line),
  ) {}

  log(context: LogContext): void {
    const severity = context.severity ?? defaultSeverityForEvent(context.event);
    const payload = {
      timestamp: new Date().toISOString(),
      service: this.service,
      ...context,
      severity,
    };

    this.write(JSON.stringify(payload));
  }
}

export class InMemoryRequestMetrics {
  private readonly byRoute = new Map<string, RouteMetricAccumulator>();
  private readonly totals: GlobalMetricAccumulator = {
    requestCount: 0,
    errorCount: 0,
    totalDurationMs: 0,
    statusCodeCounts: new Map<string, number>(),
    errorCodeCounts: new Map<string, number>(),
  };
  private readonly auth: AuthMetricAccumulator = {
    requestCount: 0,
    successCount: 0,
    failureCount: 0,
    unauthorizedAttemptCount: 0,
  };

  constructor(private readonly service: string) {}

  record(input: {
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    errorCode?: ApiErrorCode | "unknown_error";
  }): void {
    const key = `${input.method} ${input.path}`;
    const existing = this.byRoute.get(key);
    const accumulator: RouteMetricAccumulator = existing ?? {
      method: input.method,
      path: input.path,
      count: 0,
      errorCount: 0,
      totalDurationMs: 0,
      statusCodeCounts: new Map<string, number>(),
      errorCodeCounts: new Map<string, number>(),
    };

    accumulator.count += 1;
    accumulator.totalDurationMs += input.durationMs;
    if (input.statusCode >= 400) {
      accumulator.errorCount += 1;
    }

    const statusCodeKey = String(input.statusCode);
    incrementCounter(accumulator.statusCodeCounts, statusCodeKey);
    incrementCounter(this.totals.statusCodeCounts, statusCodeKey);

    if (input.errorCode) {
      incrementCounter(accumulator.errorCodeCounts, input.errorCode);
      incrementCounter(this.totals.errorCodeCounts, input.errorCode);
    }

    this.byRoute.set(key, accumulator);

    this.totals.requestCount += 1;
    this.totals.totalDurationMs += input.durationMs;
    if (input.statusCode >= 400) {
      this.totals.errorCount += 1;
    }

    if (isAuthPath(input.path)) {
      this.auth.requestCount += 1;
      if (input.statusCode >= 400) {
        this.auth.failureCount += 1;
      } else {
        this.auth.successCount += 1;
      }
    }

    if (input.statusCode === 401 || input.statusCode === 403) {
      this.auth.unauthorizedAttemptCount += 1;
    }
  }

  snapshot(): MetricsSnapshot {
    const routes = Array.from(this.byRoute.entries()).map(([key, value]) => ({
      key,
      method: value.method,
      path: value.path,
      count: value.count,
      errorCount: value.errorCount,
      totalDurationMs: Number(value.totalDurationMs.toFixed(2)),
      averageDurationMs:
        value.count > 0 ? Number((value.totalDurationMs / value.count).toFixed(2)) : 0,
      statusCodeCounts: toCounterSnapshot(value.statusCodeCounts),
      errorCodeCounts: toCounterSnapshot(value.errorCodeCounts),
    }));

    routes.sort(sortByRoute);

    return {
      service: this.service,
      generatedAt: new Date().toISOString(),
      routes,
      totals: {
        requestCount: this.totals.requestCount,
        errorCount: this.totals.errorCount,
        totalDurationMs: Number(this.totals.totalDurationMs.toFixed(2)),
        averageDurationMs:
          this.totals.requestCount > 0
            ? Number((this.totals.totalDurationMs / this.totals.requestCount).toFixed(2))
            : 0,
        statusCodeCounts: toCounterSnapshot(this.totals.statusCodeCounts),
        errorCodeCounts: toCounterSnapshot(this.totals.errorCodeCounts),
        auth: {
          requestCount: this.auth.requestCount,
          successCount: this.auth.successCount,
          failureCount: this.auth.failureCount,
          unauthorizedAttemptCount: this.auth.unauthorizedAttemptCount,
        },
      },
    };
  }
}
