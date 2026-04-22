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
    const { response, payload } = await requestJson("/api/v1/rental-requests/rr_seed_01/status", {
      method: "PATCH",
      headers: {
        "x-dev-user-id": "user_owner_01",
      },
      body: {
        status: "approved",
      },
    });

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.status).toBe("approved");
  });
});
