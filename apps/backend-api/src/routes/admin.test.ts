import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

describe("admin routes", () => {
  it("lists pending lands for admin", async () => {
    const { response, payload } = await requestJson("/api/v1/admin/lands/pending", {
      headers: {
        "x-dev-user-id": "admin_test",
        "x-dev-role": "admin",
      },
    });

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.data.some((item: { status: string }) => item.status === "draft")).toBe(true);
  });

  it("moderates a draft land", async () => {
    const create = await requestJson("/api/v1/lands", {
      method: "POST",
      headers: {
        "x-dev-user-id": "user_owner_for_moderation",
      },
      body: {
        title: "Lote pendiente de revision",
        area: 40,
        allowedUses: ["agricultura"],
        location: {
          province: "Panama Oeste",
          district: "Arraijan",
        },
        priceRule: {
          currency: "USD",
          pricePerMonth: 450,
        },
      },
    });

    expect(create.response.status).toBe(201);

    const landId = create.payload.data.id as string;
    const moderate = await requestJson(`/api/v1/admin/lands/${landId}/moderate`, {
      method: "PATCH",
      headers: {
        "x-dev-user-id": "admin_test",
        "x-dev-role": "admin",
      },
      body: {
        decision: "approve",
      },
    });

    expect(moderate.response.status).toBe(200);
    expect(moderate.payload.ok).toBe(true);
    expect(moderate.payload.data.status).toBe("active");
  });

  it("blocks a user and rejects authenticated access", async () => {
    const userId = `user_block_${Date.now()}`;

    const firstAuth = await requestJson("/api/v1/auth/me", {
      headers: {
        "x-dev-user-id": userId,
      },
    });

    expect(firstAuth.response.status).toBe(200);

    const blocked = await requestJson(`/api/v1/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: {
        "x-dev-user-id": "admin_test",
        "x-dev-role": "admin",
      },
      body: {
        status: "blocked",
        reason: "QA scenario",
      },
    });

    expect(blocked.response.status).toBe(200);
    expect(blocked.payload.ok).toBe(true);
    expect(blocked.payload.data.status).toBe("blocked");

    const secondAuth = await requestJson("/api/v1/auth/me", {
      headers: {
        "x-dev-user-id": userId,
      },
    });

    expect(secondAuth.response.status).toBe(403);
    expect(secondAuth.payload.ok).toBe(false);
  });
});
