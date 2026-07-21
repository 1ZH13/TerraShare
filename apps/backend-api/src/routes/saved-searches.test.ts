import { describe, it, expect, beforeEach } from "bun:test";
import mongoose from "mongoose";
import { requestJson, resetStore } from "../lib/http-test-utils";

beforeEach(async () => {
  resetStore();
  await mongoose.connection.collections.savedsearches?.drop().catch(() => {});
});

describe("saved-searches routes", () => {
  const userId = "ss_user_01";

  it("creates a saved search", async () => {
    const res = await requestJson("/api/v1/users/me/saved-searches", {
      method: "POST",
      headers: { "x-dev-user-id": userId },
      body: { name: "Terrenos en Panama", filters: { province: "Panamá", priceMax: 5000 } },
    });
    expect(res.response.status).toBe(201);
    expect(res.payload.data.name).toBe("Terrenos en Panama");
    expect(res.payload.data.filters.province).toBe("Panamá");
  });

  it("lists saved searches", async () => {
    await requestJson("/api/v1/users/me/saved-searches", {
      method: "POST",
      headers: { "x-dev-user-id": userId },
      body: { name: "Search 1", filters: { province: "Panamá" } },
    });
    const res = await requestJson("/api/v1/users/me/saved-searches", {
      headers: { "x-dev-user-id": userId },
    });
    expect(res.response.status).toBe(200);
    expect(res.payload.data.length).toBe(1);
  });

  it("deletes a saved search", async () => {
    const created = await requestJson("/api/v1/users/me/saved-searches", {
      method: "POST",
      headers: { "x-dev-user-id": userId },
      body: { name: "To delete", filters: {} },
    });
    const id = created.payload.data.id;
    const res = await requestJson(`/api/v1/users/me/saved-searches/${id}`, {
      method: "DELETE",
      headers: { "x-dev-user-id": userId },
    });
    expect(res.response.status).toBe(200);
  });

  it("rejects nameless search", async () => {
    const res = await requestJson("/api/v1/users/me/saved-searches", {
      method: "POST",
      headers: { "x-dev-user-id": userId },
      body: { name: "", filters: {} },
    });
    expect(res.response.status).toBe(400);
  });

  it("does not return other user searches", async () => {
    await requestJson("/api/v1/users/me/saved-searches", {
      method: "POST",
      headers: { "x-dev-user-id": "ss_user_02" },
      body: { name: "Other", filters: {} },
    });
    const res = await requestJson("/api/v1/users/me/saved-searches", {
      headers: { "x-dev-user-id": userId },
    });
    expect(res.payload.data.length).toBe(0);
  });

  it("returns 404 deleting non-existent search", async () => {
    const res = await requestJson("/api/v1/users/me/saved-searches/nonexistent", {
      method: "DELETE",
      headers: { "x-dev-user-id": userId },
    });
    expect(res.response.status).toBe(404);
  });
});
