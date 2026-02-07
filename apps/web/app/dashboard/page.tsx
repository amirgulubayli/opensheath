"use client";

import { useEffect, useState } from "react";

import {
  createProject,
  listDocuments,
  listProjects,
  retryDocumentIngestion,
  uploadDocument,
} from "../../src/lib/api-client";
import { getSession } from "../../src/lib/session";
import {
  mapDocumentsToDashboard,
  mapProjectsToDashboard,
  mapProjectCreateResponse,
  type ProjectDashboardState,
  type DocumentDashboardState,
} from "../../src/core-workflow-adapter";
import { mapIngestionCreateResponse, mapIngestionRetryResponse } from "../../src/ingestion-adapter";

export default function DashboardPage() {
  const [projectState, setProjectState] = useState<
    ProjectDashboardState | { status: "loading"; message?: string }
  >(() => ({
    status: "loading",
  }));
  const [documentState, setDocumentState] = useState<
    DocumentDashboardState | { status: "loading"; message?: string }
  >(() => ({
    status: "loading",
  }));
  const [projectName, setProjectName] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentSource, setDocumentSource] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [projectMessage, setProjectMessage] = useState<string | null>(null);
  const [documentMessage, setDocumentMessage] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      setProjectState({ status: "error", message: "Sign in required." });
      setDocumentState({ status: "error", message: "Sign in required." });
      return;
    }

    async function load() {
      const [projectsResponse, documentsResponse] = await Promise.all([
        listProjects({ workspaceId: session.workspaceId, sessionId: session.sessionId }),
        listDocuments({ workspaceId: session.workspaceId, sessionId: session.sessionId }),
      ]);

      setProjectState(mapProjectsToDashboard(projectsResponse));
      setDocumentState(mapDocumentsToDashboard(documentsResponse));
    }

    void load();
  }, []);

  async function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) {
      setProjectMessage("Sign in required.");
      return;
    }

    const response = await createProject({
      sessionId: session.sessionId,
      name: projectName,
    });
    const result = mapProjectCreateResponse(response);
    setProjectMessage(result.message);
    if (result.status !== "error") {
      setProjectName("");
      const projectsResponse = await listProjects({
        workspaceId: session.workspaceId,
        sessionId: session.sessionId,
      });
      setProjectState(mapProjectsToDashboard(projectsResponse));
    }
  }

  async function handleCreateDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) {
      setDocumentMessage("Sign in required.");
      return;
    }

    const response = await uploadDocument({
      sessionId: session.sessionId,
      name: documentName,
      source: documentSource,
      content: documentContent,
    });
    const result = mapIngestionCreateResponse(response);
    setDocumentMessage(result.message);
    if (result.status !== "error") {
      setDocumentName("");
      setDocumentSource("");
      setDocumentContent("");
      const documentsResponse = await listDocuments({
        workspaceId: session.workspaceId,
        sessionId: session.sessionId,
      });
      setDocumentState(mapDocumentsToDashboard(documentsResponse));
    }
  }

  async function handleRetry(documentId: string, replayDeadLetter: boolean) {
    const session = getSession();
    if (!session) {
      setDocumentMessage("Sign in required.");
      return;
    }

    const response = await retryDocumentIngestion({
      sessionId: session.sessionId,
      documentId,
      ...(replayDeadLetter ? { replayDeadLetter } : {}),
    });
    const result = mapIngestionRetryResponse(response);
    setDocumentMessage(result.message);
    const documentsResponse = await listDocuments({
      workspaceId: session.workspaceId,
      sessionId: session.sessionId,
    });
    setDocumentState(mapDocumentsToDashboard(documentsResponse));
  }

  return (
    <section className="card">
      <div className="title">Dashboard</div>
      <p className="muted">Live data from the API is now visible below.</p>
      <div className="grid">
        <a className="card" href="/ai">
          <strong>AI Actions</strong>
          <p className="muted">Execute tools and review runs.</p>
        </a>
        <a className="card" href="/retrieval">
          <strong>Retrieval</strong>
          <p className="muted">Query indexed content and citations.</p>
        </a>
        <a className="card" href="/analytics">
          <strong>Analytics</strong>
          <p className="muted">Usage safeguards and adoption insights.</p>
        </a>
      </div>
      <div className="grid">
        <div className="card">
          <strong>Projects</strong>
          <form onSubmit={handleCreateProject} className="form">
            <input
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              className="input"
              placeholder="New project name"
              required
            />
            <button className="button" type="submit">Create</button>
          </form>
          {projectMessage ? <p className="muted">{projectMessage}</p> : null}
          {projectState.status === "loading" ? (
            <p className="muted">Loading projects...</p>
          ) : projectState.status === "error" ? (
            <p className="error">{projectState.message}</p>
          ) : projectState.status === "empty" ? (
            <p className="muted">{projectState.message}</p>
          ) : (
            <ul>
              {projectState.projects.map((project) => (
                <li key={project.projectId}>
                  {project.name} · {project.statusLabel}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <strong>Documents</strong>
          <form onSubmit={handleCreateDocument} className="form">
            <input
              value={documentName}
              onChange={(event) => setDocumentName(event.target.value)}
              className="input"
              placeholder="Document name"
              required
            />
            <input
              value={documentSource}
              onChange={(event) => setDocumentSource(event.target.value)}
              className="input"
              placeholder="Source URI"
              required
            />
            <textarea
              value={documentContent}
              onChange={(event) => setDocumentContent(event.target.value)}
              className="textarea"
              placeholder="Paste document content"
              rows={4}
              required
            />
            <button className="button" type="submit">Upload & index</button>
          </form>
          {documentMessage ? <p className="muted">{documentMessage}</p> : null}
          {documentState.status === "loading" ? (
            <p className="muted">Loading documents...</p>
          ) : documentState.status === "error" ? (
            <p className="error">{documentState.message}</p>
          ) : documentState.status === "empty" ? (
            <p className="muted">{documentState.message}</p>
          ) : (
            <ul>
              {documentState.documents.map((doc) => (
                <li key={doc.documentId}>
                  {doc.name} · {doc.statusLabel}
                  {doc.retryEligible ? (
                    <button
                      className="button button--ghost"
                      type="button"
                      onClick={() => handleRetry(doc.documentId, doc.replayRequired)}
                    >
                      {doc.replayRequired ? "Replay" : "Retry"}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <strong>AI Runs</strong>
          <p className="muted">AI run history UI is next.</p>
        </div>
      </div>
      <style>{`
        ul { margin: 8px 0 0; padding-left: 18px; }
        .error { color: #c0392b; }
        .form { display: grid; gap: 8px; margin: 10px 0; }
        .input, .textarea { padding: 8px 10px; border-radius: 8px; border: 1px solid #d6d8e7; }
        .button { padding: 8px 10px; border-radius: 8px; border: none; background: #3b4eff; color: #fff; cursor: pointer; }
        .button--ghost { margin-left: 8px; background: transparent; color: #3b4eff; border: 1px solid #3b4eff; }
      `}</style>
    </section>
  );
}
