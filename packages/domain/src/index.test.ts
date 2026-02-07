import assert from "node:assert/strict";
import test from "node:test";

import {
  DefaultAuthorizationService,
  DomainError,
  InMemoryAuthService,
} from "./index.js";

test("signIn creates retrievable sessions for valid credentials", async () => {
  const service = new InMemoryAuthService();

  const session = await service.signIn({
    email: "admin@example.com",
    password: "password123",
  });

  const resolved = await service.requireSession(session.sessionId);
  assert.equal(resolved.userId, "usr_default");
  assert.equal(resolved.workspaceId, "ws_default");
});

test("signIn rejects invalid credentials", async () => {
  const service = new InMemoryAuthService();

  await assert.rejects(
    () =>
      service.signIn({
        email: "admin@example.com",
        password: "wrong",
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.code, "auth_denied");
      return true;
    },
  );
});

test("signUp creates session and rejects duplicate emails", async () => {
  const service = new InMemoryAuthService();

  const created = await service.signUp({
    email: "new.user@example.com",
    password: "super-secret",
  });

  const resolved = await service.requireSession(created.sessionId);
  assert.equal(resolved.userId.startsWith("usr_"), true);

  await assert.rejects(
    () =>
      service.signUp({
        email: "new.user@example.com",
        password: "another-secret",
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.code, "conflict");
      return true;
    },
  );
});

test("refreshSession rotates session id and invalidates prior session", async () => {
  const service = new InMemoryAuthService();
  const session = await service.signIn({
    email: "admin@example.com",
    password: "password123",
  });

  const refreshed = await service.refreshSession(session.sessionId);
  assert.notEqual(refreshed.sessionId, session.sessionId);
  assert.equal(refreshed.userId, session.userId);

  await assert.rejects(
    () => service.requireSession(session.sessionId),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.code, "auth_denied");
      return true;
    },
  );
});

test("signInWithOAuth links existing identity and issues session", async () => {
  const service = new InMemoryAuthService();

  const result = await service.signInWithOAuth({
    provider: "google",
    authorizationCode: "auth_code_1",
    state: "state_1",
    email: "admin@example.com",
    providerAccountId: "google_user_1",
  });

  assert.equal(result.provider, "google");
  assert.equal(result.linkStatus, "linked_existing");

  const resolved = await service.requireSession(result.session.sessionId);
  assert.equal(resolved.userId, "usr_default");
});

test("signInWithOAuth creates new account when identity is unknown", async () => {
  const service = new InMemoryAuthService();

  const result = await service.signInWithOAuth({
    provider: "github",
    authorizationCode: "auth_code_2",
    state: "state_2",
    email: "oauth.new@example.com",
    providerAccountId: "github_user_99",
  });

  assert.equal(result.provider, "github");
  assert.equal(result.linkStatus, "created_new");
  assert.equal(result.session.userId.startsWith("usr_"), true);
});

test("authorization service rejects missing permission", () => {
  const authorization = new DefaultAuthorizationService();

  assert.throws(
    () => authorization.requirePermission(["member"], "membership.update"),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.code, "policy_denied");
      return true;
    },
  );
});
