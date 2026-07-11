import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

describe("analytics routes", () => {
  it("returns overview for an admin (no longer 403)", async () => {
    const { response, payload } = await requestJson("/api/v1/analytics/overview", {
      headers: { "x-dev-user-id": "admin_analytics", "x-dev-role": "admin" },
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

  // #140 F-4: approvalRate dividía por las solicitudes recientes pero el guard
  // era sobre el total, así que devolvía NaN (→ null en JSON) cuando había
  // solicitudes históricas pero ninguna en los últimos 30 días. Debe ser
  // siempre un número finito.
  it("returns a finite approvalRate, never NaN/null (F-4)", async () => {
    const { response, payload } = await requestJson("/api/v1/analytics/requests", {
      headers: { "x-dev-user-id": "admin_analytics", "x-dev-role": "admin" },
    });

    expect(response.status).toBe(200);
    const rate = payload.data.approvalRate;
    expect(rate).not.toBeNull();
    expect(typeof rate).toBe("number");
    expect(Number.isFinite(rate)).toBe(true);
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(100);
  });

  it("forbids owner analytics for a different, non-admin user", async () => {
    const { response, payload } = await requestJson("/api/v1/analytics/owner/user_owner_01", {
      headers: { "x-dev-user-id": "user_tenant_99" },
    });

    expect(response.status).toBe(403);
    expect(payload.ok).toBe(false);
  });
});
