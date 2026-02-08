import assert from "node:assert/strict";
import test from "node:test";

import {
  errorState,
  loadingState,
  readyState,
  resolveNavigation,
} from "./app-shell.js";

test("removed route redirects to not-found", () => {
  const result = resolveNavigation({
    path: "/dashboard",
    isAuthenticated: false,
  });

  assert.deepEqual(result, {
    kind: "redirect",
    to: "/not-found",
    reason: "route_not_found",
  });
});

test("sign-in route redirects to home when authenticated", () => {
  const result = resolveNavigation({
    path: "/sign-in",
    isAuthenticated: true,
  });

  assert.deepEqual(result, {
    kind: "redirect",
    to: "/",
    reason: "already_authenticated",
  });
});

test("unknown routes redirect to not-found", () => {
  const result = resolveNavigation({
    path: "/missing-route",
    isAuthenticated: false,
  });

  assert.deepEqual(result, {
    kind: "redirect",
    to: "/not-found",
    reason: "route_not_found",
  });
});

test("normalize path behavior allows rendering route with trailing slash", () => {
  const result = resolveNavigation({
    path: "/openclaw/",
    isAuthenticated: true,
  });

  assert.equal(result.kind, "render");
  if (result.kind === "render") {
    assert.equal(result.route.id, "openclaw");
  }
});

test("UI surface state helpers are deterministic", () => {
  assert.deepEqual(loadingState(), { status: "loading" });
  assert.deepEqual(readyState(), { status: "ready" });
  assert.deepEqual(errorState("Request failed"), {
    status: "error",
    message: "Request failed",
    retryable: true,
  });
  assert.deepEqual(errorState("Request failed", { retryable: false }), {
    status: "error",
    message: "Request failed",
    retryable: false,
  });
});

