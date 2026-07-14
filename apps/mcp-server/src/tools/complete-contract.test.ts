import { describe, expect, it, beforeEach } from "bun:test";

import { Contract, User } from "@backend/db/schemas";
import { completeContract } from "./complete-contract";

const ownerUser = { id: "user_seed", role: "user" };
const tenantUser = { id: "user_regular", role: "user" };
const adminUser = { id: "user_admin", role: "admin" };

describe("complete_contract tool (HU-75 #192)", () => {
  beforeEach(async () => {
    await User.findOneAndUpdate(
      { clerkUserId: "user_seed" },
      { clerkUserId: "user_seed", email: "seed@test.com", role: "user", status: "active", profile: { fullName: "Seed Owner" } },
      { upsert: true },
    );
    await Contract.deleteMany({});
    await Contract.insertMany([
      {
        id: "contract_active",
        rentalRequestId: "req_1",
        ownerId: "user_seed",
        tenantId: "user_regular",
        terms: { summary: "Alquiler activo", signedAt: "2026-07-01", startsAt: "2026-08-01", endsAt: "2026-12-31" },
        status: "active",
      },
      {
        id: "contract_draft",
        rentalRequestId: "req_2",
        ownerId: "user_seed",
        tenantId: "user_regular",
        terms: { summary: "Borrador", startsAt: "2026-08-01", endsAt: "2026-12-31" },
        status: "draft",
      },
    ]);
  });

  it("owner completa contrato activo → completed", async () => {
    const res = await completeContract({ contractId: "contract_active" }, ownerUser);
    expect((res as { status: string }).status).toBe("completed");
  });

  it("admin puede completar contratos de otros", async () => {
    const res = await completeContract({ contractId: "contract_active" }, adminUser);
    expect((res as { status: string }).status).toBe("completed");
  });

  it("tenant NO puede completar (solo owner/admin)", async () => {
    try {
      await completeContract({ contractId: "contract_active" }, tenantUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("Solo el propietario");
    }
  });

  it("draft → complete lanza error", async () => {
    try {
      await completeContract({ contractId: "contract_draft" }, ownerUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("activos");
    }
  });

  it("contrato inexistente lanza error", async () => {
    try {
      await completeContract({ contractId: "contract_nonexistent" }, ownerUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("no encontrado");
    }
  });
});
