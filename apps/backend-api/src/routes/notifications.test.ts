import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

describe("notifications routes", () => {
  it("responds 200 with an empty list when the user has no notifications", async () => {
    const { response, payload } = await requestJson("/api/v1/notifications", {
      headers: { "x-dev-user-id": "user_owner_01" },
    });

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.data).toHaveLength(0);
  });

  it("requires authentication", async () => {
    const { response } = await requestJson("/api/v1/notifications");

    expect(response.status).toBe(401);
  });
});
