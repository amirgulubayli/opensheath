import { randomUUID } from "node:crypto";

import { createEventEnvelope, type ProjectEvent } from "@ethoxford/contracts";

import { DomainError, ensureWorkspaceContext, type RequestContext } from "./shared.js";

export type ProjectStatus = "draft" | "active" | "archived";

export interface ProjectRecord {
  projectId: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const ALLOWED_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ["active", "archived"],
  active: ["archived"],
  archived: [],
};

export class InMemoryProjectService {
  private readonly projects = new Map<string, ProjectRecord>();
  private readonly eventsByProject = new Map<string, ProjectEvent[]>();

  createProject(
    context: RequestContext,
    input: {
      name: string;
      description?: string;
    },
  ): ProjectRecord {
    const workspaceId = ensureWorkspaceContext(context);

    if (!context.actorId) {
      throw new DomainError("auth_denied", "Missing actor in request context", {
        field: "actorId",
      });
    }

    if (!input.name.trim()) {
      throw new DomainError("validation_denied", "Project name is required", {
        field: "name",
      });
    }

    const now = new Date().toISOString();
    const project: ProjectRecord = {
      projectId: `prj_${randomUUID()}`,
      workspaceId,
      name: input.name,
      status: "draft",
      createdBy: context.actorId,
      createdAt: now,
      updatedAt: now,
    };

    if (input.description !== undefined) {
      project.description = input.description;
    }

    this.projects.set(project.projectId, project);
    this.recordEvent(context, "project.created", project);

    return project;
  }

  updateProject(
    context: RequestContext,
    projectId: string,
    input: {
      name?: string;
      description?: string;
    },
  ): ProjectRecord {
    const project = this.requireProjectInContext(context, projectId);

    if (input.name !== undefined && !input.name.trim()) {
      throw new DomainError("validation_denied", "Project name cannot be empty", {
        field: "name",
      });
    }

    const updated: ProjectRecord = {
      ...project,
      name: input.name ?? project.name,
      updatedAt: new Date().toISOString(),
    };

    if (input.description !== undefined) {
      updated.description = input.description;
    }

    this.projects.set(projectId, updated);
    this.recordEvent(context, "project.updated", updated);

    return updated;
  }

  transitionStatus(
    context: RequestContext,
    projectId: string,
    nextStatus: ProjectStatus,
  ): ProjectRecord {
    const project = this.requireProjectInContext(context, projectId);
    const allowed = ALLOWED_TRANSITIONS[project.status];

    if (!allowed.includes(nextStatus)) {
      throw new DomainError("validation_denied", "Invalid project status transition", {
        from: project.status,
        to: nextStatus,
      });
    }

    const updated: ProjectRecord = {
      ...project,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    this.projects.set(projectId, updated);
    this.recordEvent(
      context,
      nextStatus === "archived" ? "project.archived" : "project.updated",
      updated,
    );

    return updated;
  }

  listByWorkspace(workspaceId: string): ProjectRecord[] {
    return [...this.projects.values()].filter(
      (project) => project.workspaceId === workspaceId,
    );
  }

  getActivity(context: RequestContext, projectId: string): ProjectEvent[] {
    const project = this.requireProjectInContext(context, projectId);
    return this.eventsByProject.get(project.projectId) ?? [];
  }

  private requireProjectInContext(
    context: RequestContext,
    projectId: string,
  ): ProjectRecord {
    const workspaceId = ensureWorkspaceContext(context);
    const project = this.projects.get(projectId);

    if (!project || project.workspaceId !== workspaceId) {
      throw new DomainError("not_found", "Project not found", {
        projectId,
      });
    }

    return project;
  }

  private recordEvent(
    context: RequestContext,
    eventType: "project.created" | "project.updated" | "project.archived",
    project: ProjectRecord,
  ): void {
    const eventOptions: {
      eventId: string;
      correlationId: string;
      workspaceId: string;
      actorId?: string;
    } = {
      eventId: `evt_${randomUUID()}`,
      correlationId: context.correlationId,
      workspaceId: project.workspaceId,
    };

    if (context.actorId !== undefined) {
      eventOptions.actorId = context.actorId;
    }

    const event = createEventEnvelope(
      eventType,
      {
        projectId: project.projectId,
        workspaceId: project.workspaceId,
        status: project.status,
      },
      eventOptions,
    );

    const existing = this.eventsByProject.get(project.projectId) ?? [];
    this.eventsByProject.set(project.projectId, existing.concat(event));
  }
}
