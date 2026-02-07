import assert from "node:assert/strict";
import test from "node:test";

import { apiError, apiSuccess } from "@ethoxford/contracts";

import {
  mapProjectCreateResponse,
  mapProjectTransitionResponse,
  mapProjectUpdateResponse,
  mapDocumentActivityToTimeline,
  mapDocumentsToDashboard,
  mapProjectActivityToTimeline,
  mapProjectsToDashboard,
} from "./core-workflow-adapter.js";

test("mapProjectsToDashboard orders by updatedAt and labels status", () => {
  const state = mapProjectsToDashboard(
    apiSuccess("corr_projects", {
      projects: [
        {
          projectId: "prj_1",
          workspaceId: "ws_1",
          name: "Alpha",
          status: "draft",
          createdBy: "user_1",
          createdAt: "2026-02-07T08:00:00.000Z",
          updatedAt: "2026-02-07T08:30:00.000Z",
        },
        {
          projectId: "prj_2",
          workspaceId: "ws_1",
          name: "Beta",
          status: "active",
          createdBy: "user_1",
          createdAt: "2026-02-07T09:00:00.000Z",
          updatedAt: "2026-02-07T10:00:00.000Z",
        },
      ],
    }),
  );

  assert.equal(state.status, "ready");
  assert.equal(state.projects[0]?.projectId, "prj_2");
  assert.equal(state.projects[0]?.statusLabel, "Active");
});

test("mapProjectsToDashboard returns empty state for no projects", () => {
  const state = mapProjectsToDashboard(
    apiSuccess("corr_projects", {
      projects: [],
    }),
  );

  assert.equal(state.status, "empty");
  assert.equal(state.projects.length, 0);
});

test("mapDocumentsToDashboard maps ingestion status labels", () => {
  const state = mapDocumentsToDashboard(
    apiSuccess("corr_docs", {
      documents: [
        {
          documentId: "doc_1",
          workspaceId: "ws_1",
          name: "Plan",
          source: "plan.pdf",
          status: "failed",
          createdAt: "2026-02-07T08:00:00.000Z",
          updatedAt: "2026-02-07T09:00:00.000Z",
        },
      ],
    }),
  );

  assert.equal(state.status, "ready");
  assert.equal(state.documents[0]?.statusLabel, "Failed");
});

test("mapProjectActivityToTimeline maps activity events", () => {
  const state = mapProjectActivityToTimeline(
    apiSuccess("corr_activity", {
      events: [
        {
          eventId: "evt_1",
          eventType: "project.created",
          occurredAt: "2026-02-07T08:00:00.000Z",
          version: "v1",
          correlationId: "corr_activity",
          workspaceId: "ws_1",
          payload: {
            projectId: "prj_1",
            workspaceId: "ws_1",
            status: "draft",
          },
        },
      ],
    }),
  );

  assert.equal(state.status, "ready");
  assert.equal(state.items[0]?.statusLabel, "Project created");
});

test("mapDocumentActivityToTimeline returns error on API error", () => {
  const state = mapDocumentActivityToTimeline(
    apiError("corr_docs", "validation_denied", "Missing"),
  );

  assert.equal(state.status, "error");
  assert.equal(state.items.length, 0);
});

test("mapProjectCreateResponse maps successful create", () => {
  const state = mapProjectCreateResponse(
    apiSuccess("corr_project_create", {
      project: {
        projectId: "prj_new",
        workspaceId: "ws_1",
        name: "New Project",
        status: "draft",
        createdBy: "user_1",
        createdAt: "2026-02-07T08:00:00.000Z",
        updatedAt: "2026-02-07T08:00:00.000Z",
      },
    }),
  );

  assert.equal(state.status, "created");
  assert.equal(state.project?.statusLabel, "Draft");
});

test("mapProjectUpdateResponse returns error on validation", () => {
  const state = mapProjectUpdateResponse(
    apiError("corr_project_update", "validation_denied", "Missing"),
  );

  assert.equal(state.status, "error");
  assert.equal(state.retryable, false);
});

test("mapProjectTransitionResponse maps status transition", () => {
  const state = mapProjectTransitionResponse(
    apiSuccess("corr_project_transition", {
      project: {
        projectId: "prj_1",
        workspaceId: "ws_1",
        name: "Project",
        status: "archived",
        createdBy: "user_1",
        createdAt: "2026-02-07T08:00:00.000Z",
        updatedAt: "2026-02-07T09:00:00.000Z",
      },
    }),
  );

  assert.equal(state.status, "transitioned");
  assert.equal(state.project?.statusLabel, "Archived");
});
