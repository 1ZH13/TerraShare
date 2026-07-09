import { describe, expect, it, beforeEach } from "bun:test";
import { requestJson, resetStore } from "../lib/http-test-utils";

describe("rental requests - extended coverage", () => {
  beforeEach(() => {
    resetStore();
  });

  it("lists rental requests for tenant", async () => {
    const { response, payload } = await requestJson("/api/v1/rental-requests", {
      headers: { "x-dev-user-id": "user_tenant_01" },
    });
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.data)).toBe(true);
  });

  it("rejects request without required fields", async () => {
    const { response, payload } = await requestJson("/api/v1/rental-requests", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_01" },
      body: { landId: "land_seed_01" },
    });
    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
  });

  it("owner can approve a request", async () => {
    const createRes = await requestJson("/api/v1/rental-requests", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_new" },
      body: {
        landId: "land_seed_02",
        period: {
          startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 500).toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 530).toISOString(),
        },
        intendedUse: "ganaderia",
      },
    });
    const requestId = createRes.payload.data.id;

    const { response, payload } = await requestJson(`/api/v1/rental-requests/${requestId}/status`, {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_owner_02" },
      body: { status: "approved" },
    });
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.status).toBe("approved");
  });

  it("owner can reject a request", async () => {
    const createRes = await requestJson("/api/v1/rental-requests", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_reject" },
      body: {
        landId: "land_seed_02",
        period: {
          startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 600).toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 630).toISOString(),
        },
        intendedUse: "ganaderia",
      },
    });
    const requestId = createRes.payload.data.id;

    const { response, payload } = await requestJson(`/api/v1/rental-requests/${requestId}/status`, {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_owner_02" },
      body: { status: "rejected" },
    });
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.status).toBe("rejected");
  });

  it("creates a purchase offer on a land that is for sale (#249)", async () => {
    const { response, payload } = await requestJson("/api/v1/rental-requests", {
      method: "POST",
      headers: { "x-dev-user-id": "user_buyer_01" },
      body: { landId: "land_seed_04", operation: "venta", offerAmount: 190000 },
    });
    expect(response.status).toBe(201);
    expect(payload.ok).toBe(true);
    expect(payload.data.operation).toBe("venta");
    expect(payload.data.offerAmount).toBe(190000);
    expect(payload.data.status).toBe("pending_owner");
  });

  it("rejects a purchase offer without an offerAmount", async () => {
    const { response, payload } = await requestJson("/api/v1/rental-requests", {
      method: "POST",
      headers: { "x-dev-user-id": "user_buyer_02" },
      body: { landId: "land_seed_04", operation: "venta" },
    });
    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
  });

  it("rejects a purchase offer on a rent-only land", async () => {
    const { response, payload } = await requestJson("/api/v1/rental-requests", {
      method: "POST",
      headers: { "x-dev-user-id": "user_buyer_03" },
      body: { landId: "land_seed_01", operation: "venta", offerAmount: 50000 },
    });
    expect(response.status).toBe(422);
    expect(payload.ok).toBe(false);
  });

  it("owner can approve a purchase offer", async () => {
    const createRes = await requestJson("/api/v1/rental-requests", {
      method: "POST",
      headers: { "x-dev-user-id": "user_buyer_04" },
      body: { landId: "land_seed_04", operation: "venta", offerAmount: 205000 },
    });
    const requestId = createRes.payload.data.id;

    const { response, payload } = await requestJson(`/api/v1/rental-requests/${requestId}/status`, {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_owner_02" },
      body: { status: "approved" },
    });
    expect(response.status).toBe(200);
    expect(payload.data.status).toBe("approved");
  });

  it("prevents non-owner from changing status", async () => {
    const createRes = await requestJson("/api/v1/rental-requests", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_fail" },
      body: {
        landId: "land_seed_02",
        period: {
          startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 700).toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 730).toISOString(),
        },
        intendedUse: "ganaderia",
      },
    });
    const requestId = createRes.payload.data.id;

    const { response, payload } = await requestJson(`/api/v1/rental-requests/${requestId}/status`, {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_not_owner" },
      body: { status: "approved" },
    });
    expect(response.status).toBe(403);
    expect(payload.ok).toBe(false);
  });
});
