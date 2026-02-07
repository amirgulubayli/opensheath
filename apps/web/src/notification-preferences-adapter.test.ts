import assert from "node:assert/strict";
import test from "node:test";

import { apiError, apiSuccess } from "@ethoxford/contracts";

import {
  mapNotificationPreferenceListResponse,
  mapNotificationPreferenceResponse,
  mapNotificationPreferenceUpdateResponse,
} from "./notification-preferences-adapter.js";

function preference(userId: string, channels: { email: boolean; inApp: boolean; webhook: boolean }) {
  return {
    preferenceId: `npref_${userId}`,
    workspaceId: "ws_1",
    userId,
    channels,
    createdAt: "2026-02-07T10:00:00.000Z",
    updatedAt: "2026-02-07T11:00:00.000Z",
  };
}

test("mapNotificationPreferenceResponse maps single preference", () => {
  const state = mapNotificationPreferenceResponse(
    apiSuccess("corr_np_1", {
      preference: preference("owner_1", {
        email: false,
        inApp: true,
        webhook: true,
      }),
    }),
  );

  assert.equal(state.status, "ready");
  assert.equal(state.preference?.enabledChannelCount, 2);
  assert.equal(state.preference?.channelSummary, "in-app, webhook");
});

test("mapNotificationPreferenceUpdateResponse reuses deterministic mapping", () => {
  const state = mapNotificationPreferenceUpdateResponse(
    apiSuccess("corr_np_2", {
      preference: preference("owner_1", {
        email: false,
        inApp: false,
        webhook: false,
      }),
    }),
  );

  assert.equal(state.status, "ready");
  assert.equal(state.preference?.channelSummary, "All channels disabled");
});

test("mapNotificationPreferenceListResponse maps sorted list state", () => {
  const state = mapNotificationPreferenceListResponse(
    apiSuccess("corr_np_3", {
      preferences: [
        preference("member_2", {
          email: true,
          inApp: true,
          webhook: false,
        }),
        preference("admin_1", {
          email: true,
          inApp: false,
          webhook: true,
        }),
      ],
    }),
  );

  assert.equal(state.status, "ready");
  assert.equal(state.preferences.length, 2);
  assert.equal(state.preferences[0]?.userId, "admin_1");
});

test("mapNotificationPreferenceListResponse handles forbidden and generic errors", () => {
  const forbidden = mapNotificationPreferenceListResponse(
    apiError("corr_np_4", "policy_denied", "Forbidden"),
  );
  assert.equal(forbidden.status, "forbidden");
  assert.equal(forbidden.retryable, false);

  const generic = mapNotificationPreferenceListResponse(
    apiError("corr_np_5", "unavailable", "Downstream unavailable"),
  );
  assert.equal(generic.status, "error");
  assert.equal(generic.retryable, true);
});
