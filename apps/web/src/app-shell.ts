import {
  normalizeAppPath,
  type AppShellRoute,
  type UiSurfaceState,
} from "@ethoxford/contracts";

export const APP_SHELL_ROUTES: readonly AppShellRoute[] = [
  {
    id: "home",
    path: "/",
    title: "Home",
    requiresAuth: false,
  },
  {
    id: "sign_in",
    path: "/sign-in",
    title: "Sign in",
    requiresAuth: false,
  },
  {
    id: "dashboard",
    path: "/dashboard",
    title: "Dashboard",
    requiresAuth: true,
  },
  {
    id: "workspaces",
    path: "/workspaces",
    title: "Workspaces",
    requiresAuth: true,
  },
  {
    id: "ai",
    path: "/ai",
    title: "AI",
    requiresAuth: true,
  },
  {
    id: "retrieval",
    path: "/retrieval",
    title: "Retrieval",
    requiresAuth: true,
  },
  {
    id: "analytics",
    path: "/analytics",
    title: "Analytics",
    requiresAuth: true,
  },
  {
    id: "automation",
    path: "/automation",
    title: "Automation",
    requiresAuth: true,
  },
  {
    id: "integrations",
    path: "/integrations",
    title: "Integrations",
    requiresAuth: true,
  },
  {
    id: "notifications",
    path: "/notifications",
    title: "Notifications",
    requiresAuth: true,
  },
  {
    id: "webhooks",
    path: "/webhooks",
    title: "Webhooks",
    requiresAuth: true,
  },
  {
    id: "settings",
    path: "/settings",
    title: "Settings",
    requiresAuth: true,
  },
  {
    id: "not_found",
    path: "/not-found",
    title: "Not Found",
    requiresAuth: false,
  },
] as const;

export type NavigationDecision =
  | {
      kind: "render";
      route: AppShellRoute;
    }
  | {
      kind: "redirect";
      to: string;
      reason: "auth_required" | "already_authenticated" | "route_not_found";
    };

export interface NavigationInput {
  path: string;
  isAuthenticated: boolean;
}

function findRoute(path: string): AppShellRoute | undefined {
  const normalizedPath = normalizeAppPath(path);
  return APP_SHELL_ROUTES.find((route) => route.path === normalizedPath);
}

export function resolveNavigation(input: NavigationInput): NavigationDecision {
  const route = findRoute(input.path);

  if (!route) {
    return {
      kind: "redirect",
      to: "/not-found",
      reason: "route_not_found",
    };
  }

  if (route.requiresAuth && !input.isAuthenticated) {
    return {
      kind: "redirect",
      to: "/sign-in",
      reason: "auth_required",
    };
  }

  if (route.id === "sign_in" && input.isAuthenticated) {
    return {
      kind: "redirect",
      to: "/dashboard",
      reason: "already_authenticated",
    };
  }

  return {
    kind: "render",
    route,
  };
}

export function loadingState(): UiSurfaceState {
  return {
    status: "loading",
  };
}

export function readyState(): UiSurfaceState {
  return {
    status: "ready",
  };
}

export function errorState(
  message: string,
  options?: {
    retryable?: boolean;
  },
): UiSurfaceState {
  return {
    status: "error",
    message,
    retryable: options?.retryable ?? true,
  };
}

