import { describe, expect, it } from "bun:test";
import { requestJson } from "../lib/http-test-utils";

describe("auth routes - extended coverage", () => {
  it("GET /auth/me returns user profile", async () => {
    const { response, payload } = await requestJson("/api/v1/auth/me", {
      headers: { "x-dev-user-id": "user_profile_test" },
    });
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.clerkUserId).toBe("user_profile_test");
  });

  it("PATCH /auth/profile updates phone", async () => {
    const { response, payload } = await requestJson("/api/v1/auth/profile", {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_phone_test" },
      body: { phone: "+50761234567" },
    });
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.profile.phone).toBe("+50761234567");
  });

  it("admin can access admin routes", async () => {
    const { response, payload } = await requestJson("/api/v1/admin/summary", {
      headers: { "x-dev-user-id": "admin_access_test", "x-dev-role": "admin" },
    });
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
  });

  it("non-admin cannot access admin routes", async () => {
    const { response, payload } = await requestJson("/api/v1/admin/summary", {
      headers: { "x-dev-user-id": "user_not_admin" },
    });
    expect(response.status).toBe(403);
    expect(payload.ok).toBe(false);
  });

  it("returns error for unknown routes", async () => {
    const { response, payload } = await requestJson("/api/v1/nonexistent");
    expect([404, 403]).toContain(response.status);
    expect(payload.ok).toBe(false);
  });
});
