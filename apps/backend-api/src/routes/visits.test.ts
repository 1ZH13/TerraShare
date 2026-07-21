import { describe, it, expect, beforeEach } from "bun:test";
import mongoose from "mongoose";
import { requestJson, resetStore } from "../lib/http-test-utils";

beforeEach(async () => {
  resetStore();
  await mongoose.connection.collections.visits?.drop().catch(() => {});
  await mongoose.connection.collections.notifications?.drop().catch(() => {});
});

describe("visits routes", () => {
  it("creates a visit request", async () => {
    const res = await requestJson("/api/v1/lands/land_seed_01/visits", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_01" },
      body: { proposedDate: "2026-08-15", proposedTime: "10:00", message: "Quiero visitar" },
    });
    expect(res.response.status).toBe(201);
    expect(res.payload.data.status).toBe("pending");
    expect(res.payload.data.proposedDate).toBe("2026-08-15");
  });

  it("rejects visit to own land", async () => {
    const res = await requestJson("/api/v1/lands/land_seed_01/visits", {
      method: "POST",
      headers: { "x-dev-user-id": "user_owner_01" },
      body: { proposedDate: "2026-08-15", proposedTime: "10:00" },
    });
    expect(res.response.status).toBe(403);
  });

  it("returns 404 for non-existent land", async () => {
    const res = await requestJson("/api/v1/lands/nonexistent/visits", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_01" },
      body: { proposedDate: "2026-08-15", proposedTime: "10:00" },
    });
    expect(res.response.status).toBe(404);
  });

  it("lists visits as tenant", async () => {
    await requestJson("/api/v1/lands/land_seed_01/visits", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_01" },
      body: { proposedDate: "2026-08-15", proposedTime: "10:00" },
    });
    const res = await requestJson("/api/v1/users/me/visits", {
      headers: { "x-dev-user-id": "user_tenant_01" },
    });
    expect(res.response.status).toBe(200);
    expect(res.payload.data.length).toBe(1);
  });

  it("lists visits as owner", async () => {
    await requestJson("/api/v1/lands/land_seed_01/visits", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_01" },
      body: { proposedDate: "2026-08-15", proposedTime: "10:00" },
    });
    const res = await requestJson("/api/v1/users/me/visits", {
      headers: { "x-dev-user-id": "user_owner_01" },
    });
    expect(res.response.status).toBe(200);
    expect(res.payload.data.length).toBe(1);
  });

  it("owner can confirm a visit", async () => {
    const created = await requestJson("/api/v1/lands/land_seed_01/visits", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_01" },
      body: { proposedDate: "2026-08-15", proposedTime: "10:00" },
    });
    const visitId = created.payload.data.id;
    const res = await requestJson(`/api/v1/visits/${visitId}`, {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_owner_01" },
      body: { status: "confirmed" },
    });
    expect(res.response.status).toBe(200);
    expect(res.payload.data.status).toBe("confirmed");
  });

  it("tenant cannot confirm a visit", async () => {
    const created = await requestJson("/api/v1/lands/land_seed_01/visits", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_01" },
      body: { proposedDate: "2026-08-15", proposedTime: "10:00" },
    });
    const visitId = created.payload.data.id;
    const res = await requestJson(`/api/v1/visits/${visitId}`, {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_tenant_01" },
      body: { status: "confirmed" },
    });
    expect(res.response.status).toBe(403);
  });

  it("owner can reject a visit", async () => {
    const created = await requestJson("/api/v1/lands/land_seed_01/visits", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_01" },
      body: { proposedDate: "2026-08-15", proposedTime: "10:00" },
    });
    const visitId = created.payload.data.id;
    const res = await requestJson(`/api/v1/visits/${visitId}`, {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_owner_01" },
      body: { status: "rejected", responseMessage: "No disponible" },
    });
    expect(res.response.status).toBe(200);
    expect(res.payload.data.status).toBe("rejected");
  });
});
