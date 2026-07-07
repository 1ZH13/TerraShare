import { describe, expect, it } from "bun:test";
import { requestJson } from "../lib/http-test-utils";

describe("lands routes - extended coverage", () => {
  it("rejects land creation without required fields", async () => {
    const { response, payload } = await requestJson("/api/v1/lands", {
      method: "POST",
      headers: { "x-dev-user-id": "user_test" },
      body: { title: "Solo titulo" },
    });

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns land detail by id", async () => {
    const { response, payload } = await requestJson("/api/v1/lands/land_seed_01");
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.id).toBe("land_seed_01");
  });

  it("returns 404 for non-existent land", async () => {
    const { response, payload } = await requestJson("/api/v1/lands/nonexistent");
    expect(response.status).toBe(404);
    expect(payload.ok).toBe(false);
  });

  it("lists lands with pagination", async () => {
    const { response, payload } = await requestJson("/api/v1/lands?page=1&pageSize=10");
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.pagination).toBeDefined();
    expect(payload.data.pagination.page).toBe(1);
    expect(payload.data.pagination.pageSize).toBe(10);
  });

  it("filters lands by province", async () => {
    const { response, payload } = await requestJson("/api/v1/lands?province=Panama");
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.data.items)).toBe(true);
  });

  it("filters lands by use type", async () => {
    const { response, payload } = await requestJson("/api/v1/lands?use=agricultura");
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
  });

  it("rejects invalid sort field", async () => {
    const { response, payload } = await requestJson("/api/v1/lands?sort=invalid");
    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
  });

  it("allows owner to get their lands via /lands with owner filter", async () => {
    const { response, payload } = await requestJson("/api/v1/lands", {
      headers: { "x-dev-user-id": "user_owner_01" },
    });
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.data.items)).toBe(true);
  });

  it("prevents non-owner from updating land", async () => {
    const { response, payload } = await requestJson("/api/v1/lands/land_seed_01", {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_not_owner" },
      body: { title: "Hacked" },
    });
    expect(response.status).toBe(403);
    expect(payload.ok).toBe(false);
  });

  it("allows owner to update their land", async () => {
    const { response, payload } = await requestJson("/api/v1/lands/land_seed_01", {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_owner_01" },
      body: { title: "Lote Actualizado" },
    });
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.title).toBe("Lote Actualizado");
  });

  it("allows owner to change land status", async () => {
    const { response, payload } = await requestJson("/api/v1/lands/land_seed_01/status", {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_owner_01" },
      body: { status: "inactive" },
    });
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.status).toBe("inactive");
  });

  it("rejects invalid land status", async () => {
    const { response, payload } = await requestJson("/api/v1/lands/land_seed_01/status", {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_owner_01" },
      body: { status: "invalid_status" },
    });
    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
  });

  it("allows owner to delete their land", async () => {
    const { response, payload } = await requestJson("/api/v1/lands/land_seed_01", {
      method: "DELETE",
      headers: { "x-dev-user-id": "user_owner_01" },
    });
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.deleted).toBe(true);
  });

  it("prevents non-owner from deleting land", async () => {
    const { response, payload } = await requestJson("/api/v1/lands/land_seed_01", {
      method: "DELETE",
      headers: { "x-dev-user-id": "user_not_owner" },
    });
    expect(response.status).toBe(403);
    expect(payload.ok).toBe(false);
  });

  it("admin can update any land", async () => {
    const { response, payload } = await requestJson("/api/v1/lands/land_seed_01", {
      method: "PATCH",
      headers: { "x-dev-user-id": "admin_test", "x-dev-role": "admin" },
      body: { title: "Admin Updated" },
    });
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
  });
});
