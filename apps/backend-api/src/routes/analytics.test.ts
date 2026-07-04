import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

describe("analytics routes", () => {
  it("returns overview for an admin (no longer 403)", async () => {
    const { response, payload } = await requestJson("/api/v1/analytics/overview", {
      headers: { "x-dev-role": "admin" },
    });

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.overview).toBeDefined();
  });

  it("forbids overview for a non-admin user", async () => {
    const { response, payload } = await requestJson("/api/v1/analytics/overview", {
      headers: { "x-dev-user-id": "user_tenant_99" },
    });

    expect(response.status).toBe(403);
    expect(payload.ok).toBe(false);
  });

  it("returns owner analytics for the owner themselves", async () => {
    const { response, payload } = await requestJson("/api/v1/analytics/owner/user_owner_01", {
      headers: { "x-dev-user-id": "user_owner_01" },
    });

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.totalLands).toBeGreaterThan(0);
  });

  it("forbids owner analytics for a different, non-admin user", async () => {
    const { response, payload } = await requestJson("/api/v1/analytics/owner/user_owner_01", {
      headers: { "x-dev-user-id": "user_tenant_99" },
    });

    expect(response.status).toBe(403);
    expect(payload.ok).toBe(false);
  });
});
