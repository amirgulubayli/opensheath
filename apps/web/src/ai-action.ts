import type { ApiError, ApiResponse, ToolRiskClass } from "@ethoxford/contracts";

export interface AiExecuteInput {
  toolName: string;
  toolInput: unknown;
  toolRiskClass: ToolRiskClass;
  confirmedHighRiskAction?: boolean;
}

export type AiActionRequestDecision =
  | {
      kind: "requires_confirmation";
      reason: "high_risk_tool";
      message: string;
    }
  | {
      kind: "request";
      body: {
        toolName: string;
        toolInput: unknown;
        confirmHighRiskAction?: boolean;
      };
    };

export type AiActionResultStatus =
  | "succeeded"
  | "requires_confirmation"
  | "blocked"
  | "failed";

export interface AiActionResultState {
  status: AiActionResultStatus;
  message: string;
  retryable: boolean;
}

function isConfirmationRequiredError(error: ApiError): boolean {
  if (error.code !== "policy_denied") {
    return false;
  }

  const details = error.details;
  if (!details) {
    return false;
  }

  return details.confirmationRequired === true;
}

function isModerationRequiredError(error: ApiError): boolean {
  if (error.code !== "policy_denied") {
    return false;
  }

  const details = error.details;
  if (!details) {
    return false;
  }

  return details.moderationRequired === true;
}

export function prepareAiExecuteRequest(
  input: AiExecuteInput,
): AiActionRequestDecision {
  if (input.toolRiskClass === "high" && input.confirmedHighRiskAction !== true) {
    return {
      kind: "requires_confirmation",
      reason: "high_risk_tool",
      message: "This high-risk action requires explicit confirmation.",
    };
  }

  const body: {
    toolName: string;
    toolInput: unknown;
    confirmHighRiskAction?: boolean;
  } = {
    toolName: input.toolName,
    toolInput: input.toolInput,
  };

  if (input.toolRiskClass === "high" && input.confirmedHighRiskAction === true) {
    body.confirmHighRiskAction = true;
  }

  return {
    kind: "request",
    body,
  };
}

export function mapAiExecuteResponse(response: ApiResponse<unknown>): AiActionResultState {
  if (response.ok) {
    const assistantMessage =
      response.data &&
      typeof (response.data as { assistantMessage?: unknown }).assistantMessage === "string"
        ? (response.data as { assistantMessage?: string }).assistantMessage
        : undefined;
    return {
      status: "succeeded",
      message: assistantMessage
        ? `Action completed successfully. ${assistantMessage}`
        : "Action completed successfully.",
      retryable: false,
    };
  }

  if (isConfirmationRequiredError(response)) {
    return {
      status: "requires_confirmation",
      message: "Confirmation is required before executing this high-risk action.",
      retryable: true,
    };
  }

  if (isModerationRequiredError(response)) {
    return {
      status: "blocked",
      message: "Action is blocked by safety moderation policy.",
      retryable: false,
    };
  }

  if (response.code === "policy_denied") {
    return {
      status: "blocked",
      message: "Action is blocked by policy.",
      retryable: false,
    };
  }

  return {
    status: "failed",
    message: "Action failed. Please try again.",
    retryable: response.code !== "validation_denied",
  };
}
