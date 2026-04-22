<<<<<<< Updated upstream
import { describe, expect, it } from "bun:test";
=======
import { describe, expect, it, beforeEach } from "bun:test";
>>>>>>> Stashed changes

import { requestJson } from "../lib/http-test-utils";

describe("rental requests routes", () => {
<<<<<<< Updated upstream
=======
  beforeEach(() => {
    resetStore();
  });

  it("rejects creating rental request without auth", async () => {
    const { response, payload } = await requestJson("/api/v1/rental-requests", {
      method: "POST",
      body: {
        landId: "land_seed_01",
        period: {
          startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 200).toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 260).toISOString(),
        },
        intendedUse: "agricultura",
      },
    });

    expect(response.status).toBe(401);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("UNAUTHORIZED");
  });

>>>>>>> Stashed changes
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

  it("rejects approval from a non-owner user", async () => {
    const { response, payload } = await requestJson("/api/v1/rental-requests/rr_seed_01/status", {
      method: "PATCH",
      headers: {
        "x-dev-user-id": "user_tenant_01",
      },
      body: {
        status: "approved",
      },
    });

    expect(response.status).toBe(403);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("FORBIDDEN");
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
