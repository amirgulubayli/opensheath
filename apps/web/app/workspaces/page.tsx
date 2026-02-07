"use client";

import { useEffect, useState } from "react";

import {
  acceptWorkspaceInvite,
  createWorkspace,
  inviteWorkspaceMember,
  listWorkspaceMembers,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from "../../src/lib/api-client";
import { getSession } from "../../src/lib/session";

export default function WorkspacesPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteToken, setInviteToken] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [targetRole, setTargetRole] = useState("member");
  const [members, setMembers] = useState<Array<{ userId: string; role: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    setWorkspaceId(session?.workspaceId ?? null);
    if (session?.workspaceId) {
      void refreshMembers(session.workspaceId, session.sessionId);
    }
  }, []);

  async function refreshMembers(currentWorkspaceId: string, sessionId: string) {
    const response = await listWorkspaceMembers({
      sessionId,
      workspaceId: currentWorkspaceId,
    });
    if (response.ok) {
      setMembers(response.data.members.map((member) => ({
        userId: member.userId,
        role: member.role,
      })));
      setMessage(null);
    } else {
      setMessage(response.message || "Unable to load members.");
    }
  }

  async function handleCreateWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) {
      setMessage("Sign in required.");
      return;
    }

    const response = await createWorkspace({
      sessionId: session.sessionId,
      ownerUserId: session.userId,
      name: workspaceName,
    });

    if (!response.ok) {
      setMessage(response.message || "Unable to create workspace.");
      return;
    }

    setWorkspaceId(response.data.workspace.workspaceId);
    setWorkspaceName("");
    setMessage("Workspace created.");
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) {
      setMessage("Sign in required.");
      return;
    }

    const response = await inviteWorkspaceMember({
      sessionId: session.sessionId,
      workspaceId: session.workspaceId,
      email: inviteEmail,
      role: inviteRole,
    });

    if (!response.ok) {
      setMessage(response.message || "Unable to invite member.");
      return;
    }

    setInviteEmail("");
    setInviteRole("member");
    setMessage(`Invite sent. Token: ${response.data.inviteToken}`);
  }

  async function handleAcceptInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) {
      setMessage("Sign in required.");
      return;
    }

    const response = await acceptWorkspaceInvite({
      sessionId: session.sessionId,
      inviteToken,
      userId: session.userId,
    });

    if (!response.ok) {
      setMessage(response.message || "Unable to accept invite.");
      return;
    }

    setInviteToken("");
    setMessage("Invite accepted.");
  }

  async function handleUpdateRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) {
      setMessage("Sign in required.");
      return;
    }

    const response = await updateWorkspaceMemberRole({
      sessionId: session.sessionId,
      workspaceId: session.workspaceId,
      targetUserId,
      role: targetRole,
    });

    if (!response.ok) {
      setMessage(response.message || "Unable to update role.");
      return;
    }

    setTargetUserId("");
    setMessage("Role updated.");
    await refreshMembers(session.workspaceId, session.sessionId);
  }

  async function handleRemoveMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) {
      setMessage("Sign in required.");
      return;
    }

    const response = await removeWorkspaceMember({
      sessionId: session.sessionId,
      workspaceId: session.workspaceId,
      targetUserId,
    });

    if (!response.ok) {
      setMessage(response.message || "Unable to remove member.");
      return;
    }

    setTargetUserId("");
    setMessage("Member removed.");
    await refreshMembers(session.workspaceId, session.sessionId);
  }

  return (
    <section className="card">
      <div className="title">Workspaces</div>
      <p className="muted">Create workspaces, invite members, and manage roles.</p>
      <div className="card">
        <strong>Active workspace</strong>
        <p className="muted">{workspaceId ?? "Sign in to see workspace."}</p>
      </div>
      {message ? <p className="muted">{message}</p> : null}
      <div className="grid">
        <div className="card">
          <strong>Create workspace</strong>
          <form onSubmit={handleCreateWorkspace} className="form">
            <input
              className="input"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="Workspace name"
              required
            />
            <button className="button" type="submit">Create</button>
          </form>
        </div>
        <div className="card">
          <strong>Invite member</strong>
          <form onSubmit={handleInvite} className="form">
            <input
              className="input"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="Member email"
              required
            />
            <select
              className="input"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
            >
              <option value="viewer">viewer</option>
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <button className="button" type="submit">Send invite</button>
          </form>
        </div>
        <div className="card">
          <strong>Accept invite</strong>
          <form onSubmit={handleAcceptInvite} className="form">
            <input
              className="input"
              value={inviteToken}
              onChange={(event) => setInviteToken(event.target.value)}
              placeholder="Invite token"
              required
            />
            <button className="button" type="submit">Accept</button>
          </form>
        </div>
        <div className="card">
          <strong>Update member role</strong>
          <form onSubmit={handleUpdateRole} className="form">
            <input
              className="input"
              value={targetUserId}
              onChange={(event) => setTargetUserId(event.target.value)}
              placeholder="Target user ID"
              required
            />
            <select
              className="input"
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
            >
              <option value="viewer">viewer</option>
              <option value="member">member</option>
              <option value="admin">admin</option>
              <option value="owner">owner</option>
            </select>
            <button className="button" type="submit">Update role</button>
          </form>
        </div>
        <div className="card">
          <strong>Remove member</strong>
          <form onSubmit={handleRemoveMember} className="form">
            <input
              className="input"
              value={targetUserId}
              onChange={(event) => setTargetUserId(event.target.value)}
              placeholder="Target user ID"
              required
            />
            <button className="button" type="submit">Remove</button>
          </form>
        </div>
        <div className="card">
          <strong>Members</strong>
          {members.length === 0 ? (
            <p className="muted">No members loaded.</p>
          ) : (
            <ul>
              {members.map((member) => (
                <li key={`${member.userId}-${member.role}`}>
                  {member.userId} · {member.role}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <style>{`
        .grid { display: grid; gap: 16px; }
        .form { display: grid; gap: 8px; margin-top: 10px; }
        .input { padding: 8px 10px; border-radius: 8px; border: 1px solid #d6d8e7; }
        .button { padding: 8px 10px; border-radius: 8px; border: none; background: #3b4eff; color: #fff; cursor: pointer; }
        ul { margin: 8px 0 0; padding-left: 18px; }
      `}</style>
    </section>
  );
}
