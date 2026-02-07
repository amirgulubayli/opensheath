import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryWorkspaceService,
  type RequestContext,
  type Role,
} from "./index.js";

function context(actorId: string, workspaceId: string, roles: Role[]): RequestContext {
  return {
    correlationId: "corr_identity",
    actorId,
    workspaceId,
    roles,
  };
}

test("workspace invite and accept creates membership", () => {
  const service = new InMemoryWorkspaceService();
  const workspace = service.createWorkspace("owner_1", "Workspace A");

  const invite = service.inviteMember(
    context("owner_1", workspace.workspaceId, ["owner"]),
    workspace.workspaceId,
    "user@example.com",
    "member",
  );

  const membership = service.acceptInvite(invite, "user_2");
  assert.equal(membership.workspaceId, workspace.workspaceId);
  assert.equal(membership.userId, "user_2");
  assert.equal(membership.role, "member");
});

test("non-privileged member cannot update roles", () => {
  const service = new InMemoryWorkspaceService();
  const workspace = service.createWorkspace("owner_1", "Workspace A");

  const invite = service.inviteMember(
    context("owner_1", workspace.workspaceId, ["owner"]),
    workspace.workspaceId,
    "user@example.com",
    "member",
  );
  service.acceptInvite(invite, "user_2");

  assert.throws(
    () =>
      service.updateRole(
        context("user_2", workspace.workspaceId, ["member"]),
        workspace.workspaceId,
        "owner_1",
        "admin",
      ),
    /Insufficient permission/,
  );
});
