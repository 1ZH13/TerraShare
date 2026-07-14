import { describe, expect, it, beforeEach } from "bun:test";

import { Land, RentalRequest, Payment, User } from "@backend/db/schemas";
import { getOwnerAnalytics } from "./get-owner-analytics";

const ownerUser = { id: "user_seed", role: "user" };
const adminUser = { id: "user_admin", role: "admin" };
const outsiderUser = { id: "user_regular", role: "user" };

describe("get_owner_analytics tool (HU-89 #206)", () => {
  beforeEach(async () => {
    await User.findOneAndUpdate(
      { clerkUserId: "user_seed" },
      { clerkUserId: "user_seed", email: "seed@test.com", role: "user", status: "active", profile: { fullName: "Seed Owner" } },
      { upsert: true },
    );
    await Payment.deleteMany({});
    await RentalRequest.deleteMany({});
    await Land.deleteMany({});
    await Land.insertMany([
      { id: "land_a", ownerId: "user_seed", title: "Finca A", area: 10, allowedUses: ["agricultura"], location: { province: "Chiriqui", district: "David" }, priceRule: { currency: "USD", pricePerMonth: 300 }, status: "active", operation: "alquiler" },
      { id: "land_b", ownerId: "user_seed", title: "Finca B", area: 20, allowedUses: ["ganaderia"], location: { province: "Chiriqui", district: "Boquete" }, priceRule: { currency: "USD", pricePerMonth: 800 }, status: "active", operation: "alquiler" },
      { id: "land_c", ownerId: "other_owner", title: "Finca C", area: 15, allowedUses: ["forestal"], location: { province: "Cocle", district: "Penonome" }, priceRule: { currency: "USD", pricePerMonth: 500 }, status: "active", operation: "alquiler" },
    ]);
    await RentalRequest.insertMany([
      { id: "req_1", landId: "land_a", tenantId: "user_regular", operation: "alquiler", status: "approved", createdAt: new Date("2026-07-01"), updatedAt: new Date("2026-07-02") },
      { id: "req_2", landId: "land_a", tenantId: "user_regular", operation: "alquiler", status: "pending_owner", createdAt: new Date("2026-07-10") },
      { id: "req_3", landId: "land_b", tenantId: "user_regular", operation: "alquiler", status: "paid", createdAt: new Date("2026-07-05"), updatedAt: new Date("2026-07-06") },
      { id: "req_4", landId: "land_b", tenantId: "user_regular", operation: "alquiler", status: "rejected", createdAt: new Date("2026-07-08"), updatedAt: new Date("2026-07-09") },
    ]);
    await Payment.insertMany([
      { id: "pay_1", rentalRequestId: "req_3", amount: 800, currency: "USD", status: "paid" },
    ]);
  });

  it("devuelve metricas correctas para el dueño", async () => {
    const res = await getOwnerAnalytics({}, ownerUser);
    expect((res as { totalLands: number }).totalLands).toBe(2);
    expect((res as { totalRequests: number }).totalRequests).toBe(4);
    expect((res as { pendingOwner: number }).pendingOwner).toBe(1);
    expect((res as { approved: number }).approved).toBe(1);
    expect((res as { totalRevenue: number }).totalRevenue).toBe(800);
  });

  it(" landsByCategory cuenta por uso", async () => {
    const res = await getOwnerAnalytics({}, ownerUser);
    const cats = (res as { landsByCategory: Record<string, number> }).landsByCategory;
    expect(cats["agricultura"]).toBe(1);
    expect(cats["ganaderia"]).toBe(1);
  });

  it("requestApprovalRate calcula correctamente", async () => {
    const res = await getOwnerAnalytics({}, ownerUser);
    expect((res as { requestApprovalRate: number }).requestApprovalRate).toBe(0.5);
  });

  it("admin puede ver analytics de otro usuario", async () => {
    const res = await getOwnerAnalytics({ ownerId: "user_seed" }, adminUser);
    expect((res as { totalLands: number }).totalLands).toBe(2);
  });

  it("usuario regular NO puede ver analytics de otro", async () => {
    try {
      await getOwnerAnalytics({ ownerId: "user_seed" }, outsiderUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("No autorizado");
    }
  });

  it("owner sin datos devuelve ceros", async () => {
    const emptyOwner = { id: "empty_owner", role: "user" };
    const res = await getOwnerAnalytics({}, emptyOwner);
    expect((res as { totalLands: number }).totalLands).toBe(0);
    expect((res as { totalRequests: number }).totalRequests).toBe(0);
    expect((res as { totalRevenue: number }).totalRevenue).toBe(0);
  });
});
