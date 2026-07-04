import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

describe("leads routes", () => {
  it("creates a lead at /api/v1/leads", async () => {
    const email = `lead_${crypto.randomUUID()}@example.com`;
    const { response, payload } = await requestJson("/api/v1/leads", {
      method: "POST",
      body: { email, source: "landing" },
    });

    expect(response.status).toBe(201);
    expect(payload.ok).toBe(true);
    expect(payload.data.email).toBe(email);
    expect(payload.data.id).toBeDefined();
  });

  it("rejects an invalid email", async () => {
    const { response, payload } = await requestJson("/api/v1/leads", {
      method: "POST",
      body: { email: "not-an-email" },
    });

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
  });
});
