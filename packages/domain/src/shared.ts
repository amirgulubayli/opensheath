export interface RequestContext {
  correlationId: string;
  actorId?: string;
  workspaceId?: string;
  roles: string[];
}

export class DomainError extends Error {
  readonly code:
    | "validation_denied"
    | "auth_denied"
    | "policy_denied"
    | "not_found"
    | "conflict"
    | "rate_limited"
    | "unavailable"
    | "internal_error";
  readonly details: Record<string, string | number | boolean | null> | undefined;

  constructor(
    code:
      | "validation_denied"
      | "auth_denied"
      | "policy_denied"
      | "not_found"
      | "conflict"
      | "rate_limited"
      | "unavailable"
      | "internal_error",
    message: string,
    details?: Record<string, string | number | boolean | null>,
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}

export type Role = "owner" | "admin" | "member" | "viewer";

export function ensureWorkspaceContext(context: RequestContext): string {
  if (!context.workspaceId) {
    throw new DomainError("validation_denied", "workspaceId is required in context", {
      field: "workspaceId",
    });
  }

  return context.workspaceId;
}
