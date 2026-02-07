import assert from "node:assert/strict";
import test from "node:test";

import {
  DomainError,
  InMemoryAgentRuntimeService,
  InMemoryToolRegistry,
  type RequestContext,
} from "./index.js";

const context: RequestContext = {
  correlationId: "corr_ai",
  actorId: "owner_1",
  workspaceId: "ws_1",
  roles: ["owner"],
};

test("agent runtime executes authorized tool with contract-compliant statuses", async () => {
  const registry = new InMemoryToolRegistry();
  registry.register({
    name: "echo",
    version: "v1",
    riskClass: "low",
    requiredRoles: ["owner", "admin"],
    handler: async (input) => ({
      echoed: input,
    }),
  });

  const runtime = new InMemoryAgentRuntimeService(registry);
  const result = await runtime.execute(context, {
    toolName: "echo",
    toolInput: { value: "ok" },
  });

  assert.equal(result.run.status, "completed");
  assert.equal(result.toolCall.status, "succeeded");
  assert.equal(result.toolCall.attemptCount, 1);
  assert.equal(result.toolCall.stepIndex, 0);
  assert.equal(result.toolCall.idempotencyKey.startsWith("idemp_"), true);
  assert.equal(result.run.workspaceId, "ws_1");
  assert.equal(result.run.correlationId, "corr_ai");
  assert.equal(result.run.moderationOutcome, "allowed");
  assert.equal(result.run.inputTokens > 0, true);
  assert.equal(result.run.outputTokens > 0, true);
  assert.deepEqual(result.output, {
    echoed: { value: "ok" },
  });
});

test("agent runtime blocks policy-denied tool call and stores blocked status", async () => {
  const registry = new InMemoryToolRegistry();
  registry.register({
    name: "dangerous",
    version: "v1",
    riskClass: "high",
    requiredRoles: ["owner"],
    handler: async () => ({ ok: true }),
  });

  const runtime = new InMemoryAgentRuntimeService(registry);

  await assert.rejects(
    () =>
      runtime.execute(
        {
          ...context,
          roles: ["viewer"],
        },
        {
          toolName: "dangerous",
          toolInput: {},
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.code, "policy_denied");
      return true;
    },
  );

  const runs = runtime.listRuns();
  assert.equal(runs.length, 1);
  assert.equal(runs[0]?.status, "blocked_policy");
  const runId = runs[0]?.runId;
  assert.ok(runId);
  const calls = runtime.listToolCallsByRun(runId);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.status, "blocked_policy");
});

test("agent runtime blocks execution when moderation marks payload as blocked", async () => {
  const registry = new InMemoryToolRegistry();
  registry.register({
    name: "echo",
    version: "v1",
    riskClass: "low",
    requiredRoles: ["owner"],
    handler: async (input) => ({
      echoed: input,
    }),
  });

  const runtime = new InMemoryAgentRuntimeService(
    registry,
    undefined,
    {
      evaluate: async () => ({
        outcome: "blocked",
        reason: "unsafe_payload",
      }),
    },
  );

  await assert.rejects(
    () =>
      runtime.execute(context, {
        toolName: "echo",
        toolInput: {
          text: "safe-text",
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.code, "policy_denied");
      assert.equal(error.details?.moderationRequired, true);
      assert.equal(error.details?.moderationOutcome, "blocked");
      return true;
    },
  );

  const runs = runtime.listRuns();
  assert.equal(runs.length, 1);
  assert.equal(runs[0]?.status, "blocked_policy");
  assert.equal(runs[0]?.moderationOutcome, "blocked");
});

test("agent runtime allows flagged moderation outcome and records signal", async () => {
  const registry = new InMemoryToolRegistry();
  registry.register({
    name: "echo",
    version: "v1",
    riskClass: "low",
    requiredRoles: ["owner"],
    handler: async (input) => ({
      echoed: input,
    }),
  });

  const runtime = new InMemoryAgentRuntimeService(
    registry,
    undefined,
    {
      evaluate: async () => ({
        outcome: "flagged",
        reason: "contains_sensitive_hint",
      }),
    },
  );

  const result = await runtime.execute(context, {
    toolName: "echo",
    toolInput: { text: "contains secret" },
  });

  assert.equal(result.run.status, "completed");
  assert.equal(result.run.moderationOutcome, "flagged");
  assert.equal(result.toolCall.status, "succeeded");
});

test("agent runtime retries failed tool call and succeeds", async () => {
  const registry = new InMemoryToolRegistry();
  let attempts = 0;
  registry.register({
    name: "flaky",
    version: "v2",
    riskClass: "medium",
    requiredRoles: ["owner"],
    handler: async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("temporary timeout");
      }

      return { ok: true };
    },
  });

  const runtime = new InMemoryAgentRuntimeService(registry, {
    modelName: "gpt-5-mini",
    modelVersion: "v1",
    promptVersion: "1.0.1",
    maxToolRetries: 2,
  });
  const result = await runtime.execute(context, {
    toolName: "flaky",
    toolInput: { action: "run" },
  });

  assert.equal(result.run.status, "completed");
  assert.equal(result.toolCall.status, "succeeded");
  assert.equal(result.toolCall.attemptCount, 2);
});

test("agent runtime requires explicit confirmation for high-risk tools", async () => {
  const registry = new InMemoryToolRegistry();
  registry.register({
    name: "billing.cancel",
    version: "v1",
    riskClass: "high",
    requiredRoles: ["owner"],
    handler: async () => ({ ok: true }),
  });

  const runtime = new InMemoryAgentRuntimeService(registry);

  await assert.rejects(
    () =>
      runtime.execute(context, {
        toolName: "billing.cancel",
        toolInput: { workspaceId: "ws_1" },
      }),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.code, "policy_denied");
      assert.match(error.message, /requires explicit confirmation/i);
      return true;
    },
  );
});

test("agent runtime allows confirmed high-risk tool execution", async () => {
  const registry = new InMemoryToolRegistry();
  registry.register({
    name: "billing.cancel",
    version: "v1",
    riskClass: "high",
    requiredRoles: ["owner"],
    handler: async () => ({ ok: true }),
  });

  const runtime = new InMemoryAgentRuntimeService(registry);
  const result = await runtime.execute(context, {
    toolName: "billing.cancel",
    toolInput: { workspaceId: "ws_1" },
    confirmHighRiskAction: true,
  });

  assert.equal(result.run.status, "completed");
  assert.equal(result.toolCall.status, "succeeded");
});

test("agent runtime persists provided thread ID on run records", async () => {
  const registry = new InMemoryToolRegistry();
  registry.register({
    name: "echo",
    version: "v1",
    riskClass: "low",
    requiredRoles: ["owner", "admin"],
    handler: async (input) => ({
      echoed: input,
    }),
  });

  const runtime = new InMemoryAgentRuntimeService(registry);
  const result = await runtime.execute(context, {
    toolName: "echo",
    toolInput: { value: "threaded" },
    threadId: "thread_123",
  });

  assert.equal(result.run.threadId, "thread_123");
});

test("agent runtime enforces workspace context for tenant safety", async () => {
  const registry = new InMemoryToolRegistry();
  registry.register({
    name: "echo",
    version: "v1",
    riskClass: "low",
    requiredRoles: ["owner"],
    handler: async () => ({ ok: true }),
  });

  const runtime = new InMemoryAgentRuntimeService(registry);

  await assert.rejects(
    () =>
      runtime.execute(
        {
          correlationId: "corr_missing_ws",
          actorId: "owner_1",
          roles: ["owner"],
        },
        {
          toolName: "echo",
          toolInput: {},
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.code, "validation_denied");
      return true;
    },
  );
});
