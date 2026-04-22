import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

describe("contracts and audit routes", () => {
  it("creates contract as owner", async () => {
    const { response, payload } = await requestJson("/api/v1/contracts", {
      method: "POST",
      headers: {
        "x-dev-user-id": "user_owner_01",
      },
      body: {
        rentalRequestId: "rr_seed_01",
        terms: {
          summary: "Contrato anual",
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
        },
      },
    });

    expect(response.status).toBe(201);
    expect(payload.ok).toBe(true);
    expect(payload.data.rentalRequestId).toBe("rr_seed_01");
  });

  it("lists audit events for admin", async () => {
    const { response, payload } = await requestJson("/api/v1/audit-events", {
      headers: {
        "x-dev-user-id": "admin_test",
        "x-dev-role": "admin",
      },
    });

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.data)).toBe(true);
  });
});
