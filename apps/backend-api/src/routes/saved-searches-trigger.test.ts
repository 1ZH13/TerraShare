import { describe, it, expect, beforeEach } from "bun:test";
import mongoose from "mongoose";
import { requestJson, resetStore } from "../lib/http-test-utils";

beforeEach(async () => {
  resetStore();
  await mongoose.connection.collections.savedsearches?.drop().catch(() => {});
  await mongoose.connection.collections.notifications?.drop().catch(() => {});
});

describe("saved search trigger", () => {
  const ssUserId = "ss_trigger_user_01";
  const ownerUserId = "user_owner_01";

  const landBody = {
    title: "Finca Chiriquí",
    area: 5,
    allowedUses: ["agricultura"],
    location: { province: "Chiriquí", district: "Bugaba" },
    priceRule: { currency: "USD", pricePerMonth: 500 },
  };

  it("does not trigger matcher on land creation (draft)", async () => {
    await requestJson("/api/v1/users/me/saved-searches", {
      method: "POST",
      headers: { "x-dev-user-id": ssUserId },
      body: { name: "Chiriquí", filters: { province: "Chiriquí" } },
    });

    await requestJson("/api/v1/lands", {
      method: "POST",
      headers: { "x-dev-user-id": ownerUserId },
      body: landBody,
    });

    const notifs = await mongoose.connection.collections.notifications?.find({}).toArray();
    expect((notifs ?? []).length).toBe(0);
  });

  it("triggers matcher when land transitions to active", async () => {
    await requestJson("/api/v1/users/me/saved-searches", {
      method: "POST",
      headers: { "x-dev-user-id": ssUserId },
      body: { name: "Chiriquí", filters: { province: "Chiriquí" } },
    });

    const land = await requestJson("/api/v1/lands", {
      method: "POST",
      headers: { "x-dev-user-id": ownerUserId },
      body: landBody,
    });
    const landId = land.payload.data.id;

    await requestJson(`/api/v1/lands/${landId}/status`, {
      method: "PATCH",
      headers: { "x-dev-user-id": ownerUserId },
      body: { status: "active" },
    });

    await new Promise((r) => setTimeout(r, 100));

    const notifs = await mongoose.connection.collections.notifications?.find({}).toArray();
    expect((notifs ?? []).length).toBe(1);
    expect(notifs![0].userId).toBe(ssUserId);
    expect(notifs![0].type).toBe("saved_search_match");
  });

  it("does not notify when land province does not match saved search", async () => {
    await requestJson("/api/v1/users/me/saved-searches", {
      method: "POST",
      headers: { "x-dev-user-id": ssUserId },
      body: { name: "Panamá only", filters: { province: "Panamá" } },
    });

    const land = await requestJson("/api/v1/lands", {
      method: "POST",
      headers: { "x-dev-user-id": ownerUserId },
      body: landBody,
    });
    const landId = land.payload.data.id;

    await requestJson(`/api/v1/lands/${landId}/status`, {
      method: "PATCH",
      headers: { "x-dev-user-id": ownerUserId },
      body: { status: "active" },
    });

    await new Promise((r) => setTimeout(r, 100));

    const notifs = await mongoose.connection.collections.notifications?.find({}).toArray();
    expect((notifs ?? []).length).toBe(0);
  });

  it("does not notify when land price is outside saved search range", async () => {
    const ssUserId = "user_tenant_01";
    const ownerUserId = "user_owner_01";

    // Create saved search with tight price filter (max 100)
    await requestJson("/api/v1/users/me/saved-searches", {
      method: "POST",
      headers: { "x-dev-user-id": ssUserId },
      body: { name: "Cheap only", filters: { priceMax: 100 } },
    });

    // Create land with price above the filter (pricePerMonth: 850 from seed or use a custom one)
    const land = await requestJson("/api/v1/lands", {
      method: "POST",
      headers: { "x-dev-user-id": ownerUserId },
      body: {
        title: "Expensive land",
        area: 50,
        allowedUses: ["agricultura"],
        location: { province: "Chiriquí", district: "Bugaba" },
        priceRule: { currency: "USD", pricePerMonth: 500 },
      },
    });
    const landId = land.payload.data.id;

    // Transition to active
    await requestJson(`/api/v1/lands/${landId}/status`, {
      method: "PATCH",
      headers: { "x-dev-user-id": ownerUserId },
      body: { status: "active" },
    });

    // Wait for fire-and-forget
    await new Promise((r) => setTimeout(r, 100));

    // Verify no notification was created
    const notifs = await mongoose.connection.collections.notifications?.find({}).toArray();
    expect((notifs ?? []).length).toBe(0);
  });
});
