import type { ApiResponse } from "@ethoxford/contracts";

export type EntitlementAccessStatus =
  | "enabled"
  | "degraded"
  | "upgrade_required"
  | "recovery_required"
  | "error";

export interface EntitlementAccessState {
  status: EntitlementAccessStatus;
  message: string;
  retryable: boolean;
  remaining?: number;
}

export interface EntitlementStateInput {
  featureResponse?: ApiResponse<{ enabled: boolean }>;
  quotaResponse?: ApiResponse<{
    quota: {
      allowed: boolean;
      remaining: number;
    };
  }>;
  lowRemainingThreshold?: number;
}

function mapFeatureResponse(
  response: ApiResponse<{ enabled: boolean }>,
): EntitlementAccessState {
  if (response.ok) {
    if (response.data.enabled) {
      return {
        status: "enabled",
        message: "Feature is enabled for the current plan.",
        retryable: false,
      };
    }

    return {
      status: "upgrade_required",
      message: "Current plan does not include this feature.",
      retryable: false,
    };
  }

  if (response.code === "not_found") {
    return {
      status: "recovery_required",
      message: "Billing subscription was not found. Sync billing before retrying.",
      retryable: true,
    };
  }

  if (response.code === "policy_denied") {
    return {
      status: "upgrade_required",
      message: "Access is restricted by billing policy.",
      retryable: false,
    };
  }

  return {
    status: "error",
    message: "Unable to verify feature entitlement.",
    retryable: response.code !== "validation_denied",
  };
}

function mapQuotaResponse(
  response: ApiResponse<{ quota: { allowed: boolean; remaining: number } }>,
  lowRemainingThreshold: number,
): EntitlementAccessState {
  if (response.ok) {
    if (!response.data.quota.allowed) {
      return {
        status: "upgrade_required",
        message: "Usage quota has been exhausted.",
        retryable: false,
        remaining: response.data.quota.remaining,
      };
    }

    if (
      Number.isFinite(response.data.quota.remaining) &&
      response.data.quota.remaining <= lowRemainingThreshold
    ) {
      return {
        status: "degraded",
        message: "Usage quota is running low.",
        retryable: false,
        remaining: response.data.quota.remaining,
      };
    }

    return {
      status: "enabled",
      message: "Quota is available.",
      retryable: false,
      ...(Number.isFinite(response.data.quota.remaining)
        ? { remaining: response.data.quota.remaining }
        : {}),
    };
  }

  if (response.code === "not_found") {
    return {
      status: "recovery_required",
      message: "Quota could not be resolved from billing state.",
      retryable: true,
    };
  }

  return {
    status: "error",
    message: "Unable to verify quota state.",
    retryable: response.code !== "validation_denied",
  };
}

function mergeEntitlementStates(
  states: readonly EntitlementAccessState[],
): EntitlementAccessState {
  const upgrade = states.find((state) => state.status === "upgrade_required");
  if (upgrade) {
    return upgrade;
  }

  const recovery = states.find((state) => state.status === "recovery_required");
  if (recovery) {
    return recovery;
  }

  const error = states.find((state) => state.status === "error");
  if (error) {
    return error;
  }

  const degraded = states.find((state) => state.status === "degraded");
  if (degraded) {
    return degraded;
  }

  return {
    status: "enabled",
    message: "Feature and quota checks passed.",
    retryable: false,
    ...(states.find((state) => state.remaining !== undefined)?.remaining !== undefined
      ? {
          remaining: states.find((state) => state.remaining !== undefined)!.remaining,
        }
      : {}),
  };
}

export function resolveEntitlementAccessState(
  input: EntitlementStateInput,
): EntitlementAccessState {
  const lowRemainingThreshold = input.lowRemainingThreshold ?? 10;
  const states: EntitlementAccessState[] = [];

  if (input.featureResponse) {
    states.push(mapFeatureResponse(input.featureResponse));
  }

  if (input.quotaResponse) {
    states.push(mapQuotaResponse(input.quotaResponse, lowRemainingThreshold));
  }

  if (states.length === 0) {
    return {
      status: "error",
      message: "No entitlement inputs were provided.",
      retryable: false,
    };
  }

  return mergeEntitlementStates(states);
}
