import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryProjectService, type RequestContext } from "./index.js";

const requestContext: RequestContext = {
  correlationId: "corr_core",
  actorId: "owner_1",
  workspaceId: "ws_1",
  roles: ["owner"],
};

test("project service enforces valid transitions and records events", () => {
  const service = new InMemoryProjectService();

  const project = service.createProject(requestContext, {
    name: "Initial Project",
  });

  const active = service.transitionStatus(requestContext, project.projectId, "active");
  assert.equal(active.status, "active");

  const archived = service.transitionStatus(requestContext, project.projectId, "archived");
  assert.equal(archived.status, "archived");

  assert.throws(
    () => service.transitionStatus(requestContext, project.projectId, "active"),
    /Invalid project status transition/,
  );

  const events = service.getActivity(requestContext, project.projectId);
  assert.equal(events.length, 3);
});
