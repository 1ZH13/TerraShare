import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

describe("rental requests routes", () => {
  it("creates rental request for a different owner land", async () => {
    const { response, payload } = await requestJson("/api/v1/rental-requests", {
      method: "POST",
      headers: {
        "x-dev-user-id": "user_tenant_99",
      },
      body: {
        landId: "land_seed_01",
        period: {
          startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 200).toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 260).toISOString(),
        },
        intendedUse: "agricultura",
      },
    });

    expect(response.status).toBe(201);
    expect(payload.ok).toBe(true);
    expect(payload.data.status).toBe("pending_owner");
  });

  it("updates status as owner", async () => {
    const createLand = await requestJson("/api/v1/lands", {
      method: "POST",
      headers: {
        "x-dev-user-id": "user_owner_rr_test",
      },
      body: {
        title: "Lote para prueba de estado",
        area: 75,
        allowedUses: ["agricultura"],
        location: {
          province: "Panama",
          district: "Panama",
        },
        priceRule: {
          currency: "USD",
          pricePerMonth: 700,
        },
      },
    });

    expect(createLand.response.status).toBe(201);

    const createRequest = await requestJson("/api/v1/rental-requests", {
      method: "POST",
      headers: {
        "x-dev-user-id": "user_tenant_rr_test",
      },
      body: {
        landId: createLand.payload.data.id,
        period: {
          startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 40).toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 120).toISOString(),
        },
        intendedUse: "agricultura",
      },
    });

    expect(createRequest.response.status).toBe(201);

    const { response, payload } = await requestJson(
      `/api/v1/rental-requests/${createRequest.payload.data.id}/status`,
      {
      method: "PATCH",
      headers: {
          "x-dev-user-id": "user_owner_rr_test",
        },
        body: {
          status: "approved",
      },
      },
    );

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.status).toBe("approved");
  });
});
