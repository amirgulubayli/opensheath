import { Context, Effect, Layer } from "effect";

import type { OpenClawInvokeRequest } from "@ethoxford/contracts";
import type {
  OpenClawGatewayRegistry,
  OpenClawMiddlewareChain,
  RequestContext,
} from "@ethoxford/domain";

export class OpenClawEffectError extends Error {
  readonly _tag = "OpenClawEffectError";

  constructor(
    readonly code: "no_gateway" | "middleware_error",
    message: string,
  ) {
    super(message);
  }
}

export class GatewayRegistryTag extends Context.Tag("OpenClawGatewayRegistry")<
  GatewayRegistryTag,
  OpenClawGatewayRegistry
>() {}

export class MiddlewareChainTag extends Context.Tag("OpenClawMiddlewareChain")<
  MiddlewareChainTag,
  OpenClawMiddlewareChain
>() {}

export function makeOpenClawLayer(deps: {
  gatewayRegistry: OpenClawGatewayRegistry;
  middlewareChain: OpenClawMiddlewareChain;
}) {
  return Layer.mergeAll(
    Layer.succeed(GatewayRegistryTag, deps.gatewayRegistry),
    Layer.succeed(MiddlewareChainTag, deps.middlewareChain),
  );
}

export const selectGatewayEffect = Effect.gen(function* (_) {
  const registry = yield* _(GatewayRegistryTag);
  const gateways = registry.list();
  const gw = gateways[0];
  if (!gw) {
    return yield* _(
      Effect.fail(new OpenClawEffectError("no_gateway", "No gateways registered")),
    );
  }
  return gw;
});

export const invokeToolEffect = (
  context: RequestContext,
  request: OpenClawInvokeRequest,
  opts: { swarmRunId?: string; agentRunId?: string; confirmHighRisk?: boolean } = {},
) =>
  Effect.gen(function* (_) {
    const chain = yield* _(MiddlewareChainTag);
    return yield* _(
      Effect.tryPromise({
        try: () => chain.execute(context, request, opts),
        catch: (err) =>
          new OpenClawEffectError(
            "middleware_error",
            err instanceof Error ? err.message : String(err),
          ),
      }),
    );
  });

export function runOpenClawEffect<A>(
  deps: { gatewayRegistry: OpenClawGatewayRegistry; middlewareChain: OpenClawMiddlewareChain },
  effect: Effect.Effect<A, OpenClawEffectError>,
): Promise<A> {
  return Effect.runPromise(effect.pipe(Effect.provide(makeOpenClawLayer(deps))));
}
