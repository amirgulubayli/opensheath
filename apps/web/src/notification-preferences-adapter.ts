import type { ApiResponse, NotificationPreferenceRecord } from "@ethoxford/contracts";

export interface NotificationPreferenceViewModel {
  preferenceId: string;
  userId: string;
  workspaceId: string;
  channels: NotificationPreferenceRecord["channels"];
  enabledChannelCount: number;
  channelSummary: string;
  updatedAt: string;
}

export interface NotificationPreferenceState {
  status: "ready" | "forbidden" | "error";
  preference?: NotificationPreferenceViewModel;
  message?: string;
  retryable: boolean;
}

export interface NotificationPreferenceListState {
  status: "ready" | "empty" | "forbidden" | "error";
  preferences: NotificationPreferenceViewModel[];
  message?: string;
  retryable: boolean;
}

function enabledChannelCount(
  channels: NotificationPreferenceRecord["channels"],
): number {
  const values = [channels.email, channels.inApp, channels.webhook];
  return values.filter(Boolean).length;
}

function channelSummary(channels: NotificationPreferenceRecord["channels"]): string {
  const parts: string[] = [];

  if (channels.email) {
    parts.push("email");
  }

  if (channels.inApp) {
    parts.push("in-app");
  }

  if (channels.webhook) {
    parts.push("webhook");
  }

  if (parts.length === 0) {
    return "All channels disabled";
  }

  return parts.join(", ");
}

function mapPreference(
  preference: NotificationPreferenceRecord,
): NotificationPreferenceViewModel {
  return {
    preferenceId: preference.preferenceId,
    userId: preference.userId,
    workspaceId: preference.workspaceId,
    channels: preference.channels,
    enabledChannelCount: enabledChannelCount(preference.channels),
    channelSummary: channelSummary(preference.channels),
    updatedAt: preference.updatedAt,
  };
}

function mapErrorStatus(
  response: ApiResponse<unknown>,
): { status: "forbidden" | "error"; message: string; retryable: boolean } {
  if (!response.ok && response.code === "policy_denied") {
    return {
      status: "forbidden",
      message: "You do not have access to these notification preferences.",
      retryable: false,
    };
  }

  return {
    status: "error",
    message: "Unable to load notification preferences.",
    retryable: !response.ok && response.code !== "validation_denied",
  };
}

export function mapNotificationPreferenceResponse(
  response: ApiResponse<{ preference: NotificationPreferenceRecord }>,
): NotificationPreferenceState {
  if (!response.ok) {
    const error = mapErrorStatus(response);
    return {
      status: error.status,
      message: error.message,
      retryable: error.retryable,
    };
  }

  return {
    status: "ready",
    preference: mapPreference(response.data.preference),
    retryable: false,
  };
}

export function mapNotificationPreferenceUpdateResponse(
  response: ApiResponse<{ preference: NotificationPreferenceRecord }>,
): NotificationPreferenceState {
  return mapNotificationPreferenceResponse(response);
}

export function mapNotificationPreferenceListResponse(
  response: ApiResponse<{ preferences: NotificationPreferenceRecord[] }>,
): NotificationPreferenceListState {
  if (!response.ok) {
    const error = mapErrorStatus(response);
    return {
      status: error.status,
      preferences: [],
      message: error.message,
      retryable: error.retryable,
    };
  }

  if (response.data.preferences.length === 0) {
    return {
      status: "empty",
      preferences: [],
      message: "No notification preferences found.",
      retryable: false,
    };
  }

  return {
    status: "ready",
    preferences: [...response.data.preferences]
      .sort((a, b) => a.userId.localeCompare(b.userId))
      .map(mapPreference),
    retryable: false,
  };
}
