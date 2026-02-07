import type { SessionDto } from "@ethoxford/contracts";

const STORAGE_KEY = "ethoxford.session";

export function getSession(): SessionDto | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      sessionId: "demo",
      userId: "usr_demo",
      workspaceId: "ws_demo",
      expiresAt: "2099-12-31T23:59:59.000Z",
    };
  }
  try {
    return JSON.parse(raw) as SessionDto;
  } catch {
    return {
      sessionId: "demo",
      userId: "usr_demo",
      workspaceId: "ws_demo",
      expiresAt: "2099-12-31T23:59:59.000Z",
    };
  }
}

export function setSession(session: SessionDto): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}
