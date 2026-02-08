import { randomUUID } from "node:crypto";

import { Clock, Duration, Effect, Ref, Schedule, pipe } from "effect";

import { relayChatMessage, type ChatRelayOptions } from "./openclaw-chat-relay.js";
import { decomposeUserMessage } from "./openclaw-task-decomposer.js";
import type {
  OrchestratorConfig,
  OrchestratorEngine,
  OrchestratorLlm,
  OrchestratorPlan,
  OrchestratorResult,
  OrchestratorSubTask,
  OrchestratorSubTaskResult,
  SubTaskType,
  ToolInvokeFunction,
} from "./openclaw-orchestrator.js";

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxConcurrency: 5,
  maxRetries: 2,
  retryBaseDelayMs: 1000,
  totalTimeoutMs: 120_000,
  subtaskTimeoutMs: 60_000,
  useLlmDecomposition: true,
  useLlmSynthesis: true,
};

interface ExecutedSubtask {
  result: OrchestratorSubTaskResult;
  replyText: string;
}

export class EffectfulOpenClawOrchestrator implements OrchestratorEngine {
  constructor(
    private readonly config: OrchestratorConfig = DEFAULT_CONFIG,
    private readonly llm?: OrchestratorLlm | null,
  ) {}

  async execute(
    message: string,
    relayOpts: ChatRelayOptions,
    toolInvoke?: ToolInvokeFunction,
  ): Promise<OrchestratorResult> {
    return Effect.runPromise(this.executeEffect(message, relayOpts, toolInvoke));
  }

  private executeEffect(
    message: string,
    relayOpts: ChatRelayOptions,
    toolInvoke?: ToolInvokeFunction,
  ): Effect.Effect<OrchestratorResult> {
    return Effect.gen(function* (_) {
      const planId = `plan_${randomUUID()}`;
      const plan = yield* _(buildPlan(planId, message, relayOpts, toolInvoke, this.config, this.llm));
      const start = yield* _(Clock.currentTimeMillis);

      const executed = yield* _(
        Effect.forEach(plan.subtasks, (subtask) =>
          runSubtask(subtask, relayOpts, toolInvoke, this.config),
        { concurrency: this.config.maxConcurrency },
        ),
      );

      const completedCount = executed.filter((e) => e.result.status === "completed").length;
      const failedCount = executed.length - completedCount;

      const synthesis = yield* _(
        synthesize(plan, executed, this.config, this.llm),
      );

      const totalDurationMs = yield* _(Clock.currentTimeMillis).pipe(
        Effect.map((end) => end - start),
      );

      return {
        planId: plan.planId,
        originalMessage: plan.originalMessage,
        strategy: plan.strategy,
        decompositionMethod: plan.decompositionMethod,
        subtasks: executed.map((e) => e.result),
        aggregatedReply: synthesis.text,
        synthesisMethod: synthesis.method,
        totalDurationMs,
        completedCount,
        failedCount,
      };
    }.bind(this));
  }
}

function buildPlan(
  planId: string,
  message: string,
  relayOpts: ChatRelayOptions,
  toolInvoke: ToolInvokeFunction | undefined,
  config: OrchestratorConfig,
  llm?: OrchestratorLlm | null,
): Effect.Effect<OrchestratorPlan> {
  return Effect.gen(function* (_) {
    const llmPlan = yield* _(
      config.useLlmDecomposition && llm
        ? Effect.tryPromise({
            try: () => llm.decompose(message),
            catch: () => null,
          })
        : Effect.succeed(null),
    );

    if (llmPlan && llmPlan.subtasks.length > 0) {
      return {
        planId,
        originalMessage: message,
        strategy: llmPlan.strategy as OrchestratorPlan["strategy"],
        decompositionMethod: "llm",
        subtasks: llmPlan.subtasks.map((s, i) => ({
          id: `sub_${i}`,
          type: s.type,
          prompt: s.prompt,
          description: s.description,
          status: "pending" as const,
          attempts: 0,
          maxAttempts: config.maxRetries + 1,
        })),
      };
    }

    const { prompts, strategy } = decomposeUserMessage(message);
    const subtasks: OrchestratorSubTask[] = prompts.map((prompt, i) => {
      const toolMatch = prompt.match(/^(?:run|invoke|call|execute|use)\s+([a-z_]\w*)/i);
      const type: SubTaskType = toolMatch ? "tool_invoke" : "chat";

      return {
        id: `sub_${i}`,
        type,
        prompt,
        description: prompt.slice(0, 60),
        status: "pending" as const,
        attempts: 0,
        maxAttempts: config.maxRetries + 1,
        ...(toolMatch ? { toolInvocation: { tool: toolMatch[1]! } } : {}),
      };
    });

    const hasTools = subtasks.some((s) => s.type === "tool_invoke");
    const hasChat = subtasks.some((s) => s.type === "chat");
    const effectiveStrategy = hasTools && hasChat ? "hybrid" : strategy;

    return {
      planId,
      originalMessage: message,
      strategy: effectiveStrategy as OrchestratorPlan["strategy"],
      decompositionMethod: "heuristic",
      subtasks,
    };
  });
}

function runSubtask(
  subtask: OrchestratorSubTask,
  relayOpts: ChatRelayOptions,
  toolInvoke: ToolInvokeFunction | undefined,
  config: OrchestratorConfig,
): Effect.Effect<ExecutedSubtask> {
  return Effect.gen(function* (_) {
    const attemptsRef = yield* _(Ref.make(0));
    const overallStart = yield* _(Clock.currentTimeMillis);

    const attempt = Effect.gen(function* (__): Effect.Effect<{ replyText: string; replyPreview: string }> {
      const attemptNumber = yield* __(Ref.updateAndGet(attemptsRef, (n) => n + 1));

      if (subtask.type === "tool_invoke") {
        if (!subtask.toolInvocation || !toolInvoke) {
          return yield* __(Effect.fail(new Error("Tool invocation unavailable")));
        }

        const toolResult = yield* __(Effect.tryPromise({
          try: () => toolInvoke(subtask.toolInvocation!.tool, subtask.toolInvocation!.action, subtask.toolInvocation!.args),
          catch: (err) => new Error(err instanceof Error ? err.message : String(err)),
        }));

        if (!toolResult.ok) {
          return yield* __(Effect.fail(new Error(toolResult.error ?? `Tool invocation failed (attempt ${attemptNumber})`)));
        }

        const reply = toolResult.responseSummary
          ?? `Tool ${subtask.toolInvocation.tool} executed successfully (HTTP ${toolResult.httpStatus})`;
        return { replyText: reply, replyPreview: reply.slice(0, 200) };
      }

      const relayResult = yield* __(Effect.tryPromise({
        try: () => relayChatMessage(subtask.prompt, {
          ...relayOpts,
          timeoutMs: config.subtaskTimeoutMs,
        }),
        catch: (err) => new Error(err instanceof Error ? err.message : String(err)),
      }));

      if (!relayResult.ok) {
        return yield* __(Effect.fail(new Error(relayResult.error ?? `Chat relay failed (attempt ${attemptNumber})`)));
      }

      const reply = relayResult.reply ?? "";
      return { replyText: reply, replyPreview: reply.slice(0, 200) };
    });

    const retrySchedule = pipe(
      Schedule.exponential(Duration.millis(config.retryBaseDelayMs)),
      Schedule.jittered,
      Schedule.recurs(config.maxRetries),
    );

    const outcome = yield* _(
      pipe(
        attempt,
        Effect.retry(retrySchedule),
        Effect.either,
      ),
    );

    const attempts = yield* _(Ref.get(attemptsRef));
    const completedAt = yield* _(Clock.currentTimeMillis);
    const durationMs = completedAt - overallStart;

    if (outcome._tag === "Right") {
      return {
        result: {
          id: subtask.id,
          type: subtask.type,
          description: subtask.description,
          status: "completed",
          attempts,
          durationMs,
          replyPreview: outcome.right.replyPreview,
        },
        replyText: outcome.right.replyText,
      };
    }

    const errorMsg = outcome.left instanceof Error ? outcome.left.message : String(outcome.left);
    return {
      result: {
        id: subtask.id,
        type: subtask.type,
        description: subtask.description,
        status: "failed",
        attempts,
        durationMs,
        error: errorMsg,
      },
      replyText: `❌ ${errorMsg}`,
    };
  });
}

function synthesize(
  plan: OrchestratorPlan,
  executed: ExecutedSubtask[],
  config: OrchestratorConfig,
  llm?: OrchestratorLlm | null,
): Effect.Effect<{ text: string; method: "llm" | "concatenation" }> {
  return Effect.gen(function* (_) {
    if (plan.subtasks.length === 1) {
      const only = executed[0];
      if (only?.result.status === "completed") {
        return { text: only.replyText, method: "concatenation" };
      }
      return {
        text: only ? only.replyText : "❌ Failed: No response from agent",
        method: "concatenation",
      };
    }

    if (config.useLlmSynthesis && llm) {
      const synthesisInput = executed.map((s) => ({
        description: s.result.description,
        reply: s.replyText,
        status: s.result.status,
      }));

      const synthesized = yield* _(
        Effect.tryPromise({
          try: () => llm.synthesize(plan.originalMessage, synthesisInput),
          catch: () => null,
        }),
      );

      if (synthesized) {
        const failed = executed.filter((e) => e.result.status === "failed");
        const failNote = failed.length > 0
          ? `\n\n_⚠️ ${failed.length} subtask${failed.length > 1 ? "s" : ""} failed: ${failed.map((f) => f.result.description).join(", ")}_`
          : "";
        return { text: synthesized + failNote, method: "llm" };
      }
    }

    const replies = executed.map((s, i) => {
      if (s.result.status === "completed") {
        if (plan.strategy === "decomposed") {
          return `**[${i + 1}]** ${s.replyText}`;
        }
        return s.replyText;
      }
      return `**[${i + 1}]** ❌ ${s.result.error ?? "Failed"}`;
    });

    return { text: replies.join("\n\n"), method: "concatenation" };
  });
}
