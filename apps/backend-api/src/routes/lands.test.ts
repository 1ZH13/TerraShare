import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

describe("lands routes", () => {
  it("returns public lands list", async () => {
    const { response, payload } = await requestJson("/api/v1/lands");

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.data.items)).toBe(true);
  });

  it("creates a land with dev auth bypass", async () => {
    const { response, payload } = await requestJson("/api/v1/lands", {
      method: "POST",
      headers: {
        "x-dev-user-id": "user_owner_test",
      },
      body: {
        title: "Lote de prueba",
        area: 50,
        allowedUses: ["agricultura"],
        location: {
          province: "Panama",
          district: "Panama",
        },
        priceRule: {
          currency: "USD",
          pricePerMonth: 500,
        },
      },
    });

    expect(response.status).toBe(201);
    expect(payload.ok).toBe(true);
    expect(payload.data.ownerId).toBe("user_owner_test");
  });
});
