import { randomUUID } from "node:crypto";

import { DomainError, type RequestContext, type Role } from "./shared.js";

export type PermissionAction =
  | "workspace.manage"
  | "membership.invite"
  | "membership.update"
  | "membership.remove"
  | "project.write"
  | "billing.manage"
  | "ai.high_risk.execute";

const ROLE_PERMISSIONS: Record<Role, PermissionAction[]> = {
  owner: [
    "workspace.manage",
    "membership.invite",
    "membership.update",
    "membership.remove",
    "project.write",
    "billing.manage",
    "ai.high_risk.execute",
  ],
  admin: [
    "membership.invite",
    "membership.update",
    "membership.remove",
    "project.write",
    "ai.high_risk.execute",
  ],
  member: ["project.write"],
  viewer: [],
};

export interface WorkspaceRecord {
  workspaceId: string;
  name: string;
  ownerUserId: string;
}

export interface MembershipRecord {
  workspaceId: string;
  userId: string;
  role: Role;
}

interface InviteRecord {
  inviteToken: string;
  workspaceId: string;
  email: string;
  role: Role;
  invitedBy: string;
}

export class DefaultAuthorizationService {
  hasPermission(roles: Role[], action: PermissionAction): boolean {
    return roles.some((role) => ROLE_PERMISSIONS[role].includes(action));
  }

  requirePermission(roles: Role[], action: PermissionAction): void {
    if (!this.hasPermission(roles, action)) {
      throw new DomainError("policy_denied", "Insufficient permission", {
        action,
      });
    }
  }
}

export class InMemoryWorkspaceService {
  private readonly authorization = new DefaultAuthorizationService();
  private readonly workspaces = new Map<string, WorkspaceRecord>();
  private readonly memberships = new Map<string, MembershipRecord>();
  private readonly invites = new Map<string, InviteRecord>();

  createWorkspace(ownerUserId: string, name: string): WorkspaceRecord {
    if (!name.trim()) {
      throw new DomainError("validation_denied", "Workspace name is required", {
        field: "name",
      });
    }

    const workspaceId = `ws_${randomUUID()}`;
    const workspace: WorkspaceRecord = {
      workspaceId,
      name,
      ownerUserId,
    };

    this.workspaces.set(workspaceId, workspace);
    this.memberships.set(this.membershipKey(workspaceId, ownerUserId), {
      workspaceId,
      userId: ownerUserId,
      role: "owner",
    });

    return workspace;
  }

  inviteMember(
    context: RequestContext,
    workspaceId: string,
    email: string,
    role: Role,
  ): string {
    this.requireWorkspaceActor(context, workspaceId, "membership.invite");

    if (!email.trim()) {
      throw new DomainError("validation_denied", "Invite email is required", {
        field: "email",
      });
    }

    const inviteToken = `inv_${randomUUID()}`;
    this.invites.set(inviteToken, {
      inviteToken,
      workspaceId,
      email: email.toLowerCase(),
      role,
      invitedBy: context.actorId ?? "system",
    });

    return inviteToken;
  }

  acceptInvite(inviteToken: string, userId: string): MembershipRecord {
    const invite = this.invites.get(inviteToken);

    if (!invite) {
      throw new DomainError("not_found", "Invite not found", {
        inviteToken,
      });
    }

    const membership: MembershipRecord = {
      workspaceId: invite.workspaceId,
      userId,
      role: invite.role,
    };

    this.memberships.set(this.membershipKey(invite.workspaceId, userId), membership);
    this.invites.delete(inviteToken);

    return membership;
  }

  updateRole(
    context: RequestContext,
    workspaceId: string,
    targetUserId: string,
    role: Role,
  ): MembershipRecord {
    this.requireWorkspaceActor(context, workspaceId, "membership.update");

    const key = this.membershipKey(workspaceId, targetUserId);
    const membership = this.memberships.get(key);

    if (!membership) {
      throw new DomainError("not_found", "Membership not found", {
        workspaceId,
        userId: targetUserId,
      });
    }

    if (membership.role === "owner") {
      throw new DomainError("policy_denied", "Owner role cannot be downgraded here", {
        targetUserId,
      });
    }

    const updated: MembershipRecord = {
      ...membership,
      role,
    };

    this.memberships.set(key, updated);
    return updated;
  }

  removeMember(
    context: RequestContext,
    workspaceId: string,
    targetUserId: string,
  ): void {
    this.requireWorkspaceActor(context, workspaceId, "membership.remove");

    const key = this.membershipKey(workspaceId, targetUserId);
    const membership = this.memberships.get(key);

    if (!membership) {
      return;
    }

    if (membership.role === "owner") {
      throw new DomainError("policy_denied", "Workspace owner cannot be removed", {
        targetUserId,
      });
    }

    this.memberships.delete(key);
  }

  listMembers(workspaceId: string): MembershipRecord[] {
    return [...this.memberships.values()].filter(
      (membership) => membership.workspaceId === workspaceId,
    );
  }

  getRolesForUser(userId: string, workspaceId: string): Role[] {
    if (userId === "usr_demo" && workspaceId === "ws_demo") {
      const key = this.membershipKey(workspaceId, userId);
      if (!this.memberships.has(key)) {
        this.workspaces.set(workspaceId, {
          workspaceId,
          name: "Demo Workspace",
          ownerUserId: userId,
        });
        this.memberships.set(key, {
          workspaceId,
          userId,
          role: "owner",
        });
      }
    }

    const membership = this.memberships.get(this.membershipKey(workspaceId, userId));
    return membership ? [membership.role] : [];
  }

  private requireWorkspaceActor(
    context: RequestContext,
    workspaceId: string,
    action: PermissionAction,
  ): void {
    if (!context.actorId) {
      throw new DomainError("auth_denied", "Missing actor in request context", {
        field: "actorId",
      });
    }

    const actorRoles = this.getRolesForUser(context.actorId, workspaceId);

    if (!actorRoles.length) {
      throw new DomainError("policy_denied", "Actor is not a workspace member", {
        workspaceId,
        actorId: context.actorId,
      });
    }

    this.authorization.requirePermission(actorRoles, action);
  }

  private membershipKey(workspaceId: string, userId: string): string {
    return `${workspaceId}:${userId}`;
  }
}
