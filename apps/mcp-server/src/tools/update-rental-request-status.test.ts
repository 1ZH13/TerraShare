import { describe, expect, it, beforeEach } from "bun:test";

import { Land, RentalRequest, User } from "@backend/db/schemas";
import { updateRentalRequestStatus } from "./update-rental-request-status";

const ownerUser = { id: "user_seed", role: "user" };
const adminUser = { id: "user_admin", role: "admin" };
const tenantUser = { id: "user_regular", role: "user" };

describe("update_rental_request_status tool (HU-72 #189)", () => {
  beforeEach(async () => {
    await User.findOneAndUpdate(
      { clerkUserId: "user_seed" },
      { clerkUserId: "user_seed", email: "seed@test.com", role: "user", status: "active", profile: { fullName: "Seed Owner" } },
      { upsert: true },
    );
    await RentalRequest.deleteMany({});
    await RentalRequest.insertMany([
      {
        id: "req_pending",
        landId: "land_a",
        tenantId: "user_regular",
        operation: "alquiler",
        status: "pending_owner",
        period: { startDate: "2026-08-01", endDate: "2026-12-31" },
        intendedUse: "agricultura",
      },
      {
        id: "req_approved",
        landId: "land_a",
        tenantId: "user_regular",
        operation: "alquiler",
        status: "approved",
        period: { startDate: "2026-08-01", endDate: "2026-12-31" },
      },
      {
        id: "req_paid",
        landId: "land_b",
        tenantId: "user_regular",
        operation: "alquiler",
        status: "paid",
      },
    ]);
  });

  it("owner aprueba solicitud pendiente", async () => {
    const res = await updateRentalRequestStatus({ requestId: "req_pending", nextStatus: "approved" }, ownerUser);
    expect((res as { status: string }).status).toBe("approved");
  });

  it("owner rechaza solicitud pendiente", async () => {
    const res = await updateRentalRequestStatus({ requestId: "req_pending", nextStatus: "rejected" }, ownerUser);
    expect((res as { status: string }).status).toBe("rejected");
  });

  it("tenant cancela su propia solicitud", async () => {
    const res = await updateRentalRequestStatus({ requestId: "req_pending", nextStatus: "cancelled" }, tenantUser);
    expect((res as { status: string }).status).toBe("cancelled");
  });

  it("tenant NO puede aprobar (solo owner/admin)", async () => {
    try {
      await updateRentalRequestStatus({ requestId: "req_pending", nextStatus: "approved" }, tenantUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("permisos");
    }
  });

  it("approved → pending_payment (siguiente paso)", async () => {
    const res = await updateRentalRequestStatus({ requestId: "req_approved", nextStatus: "pending_payment" }, ownerUser);
    expect((res as { status: string }).status).toBe("pending_payment");
  });

  it("paid → approved (terminal) lanza error", async () => {
    try {
      await updateRentalRequestStatus({ requestId: "req_paid", nextStatus: "approved" }, ownerUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("no permitida");
    }
  });

  it("solicitud inexistente lanza error", async () => {
    try {
      await updateRentalRequestStatus({ requestId: "req_nonexistent", nextStatus: "approved" }, ownerUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("no encontrada");
    }
  });

  it("admin puede hacer cualquier transición", async () => {
    const res = await updateRentalRequestStatus({ requestId: "req_pending", nextStatus: "rejected" }, adminUser);
    expect((res as { status: string }).status).toBe("rejected");
  });
});
