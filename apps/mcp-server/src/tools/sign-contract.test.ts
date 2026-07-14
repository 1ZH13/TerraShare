import { describe, expect, it, beforeEach } from "bun:test";

import { Contract, User } from "@backend/db/schemas";
import { signContract } from "./sign-contract";

const ownerUser = { id: "user_seed", role: "user" };
const tenantUser = { id: "user_regular", role: "user" };
const adminUser = { id: "user_admin", role: "admin" };
const outsiderUser = { id: "user_outsider", role: "user" };

describe("sign_contract tool (HU-74 #191)", () => {
  beforeEach(async () => {
    await User.findOneAndUpdate(
      { clerkUserId: "user_seed" },
      { clerkUserId: "user_seed", email: "seed@test.com", role: "user", status: "active", profile: { fullName: "Seed Owner" } },
      { upsert: true },
    );
    await User.findOneAndUpdate(
      { clerkUserId: "user_outsider" },
      { clerkUserId: "user_outsider", email: "outsider@test.com", role: "user", status: "active", profile: { fullName: "Outsider" } },
      { upsert: true },
    );
    await Contract.deleteMany({});
    await Contract.insertMany([
      {
        id: "contract_draft",
        rentalRequestId: "req_1",
        ownerId: "user_seed",
        tenantId: "user_regular",
        terms: { summary: "Alquiler de finca", startsAt: "2026-08-01", endsAt: "2026-12-31" },
        status: "draft",
      },
      {
        id: "contract_active",
        rentalRequestId: "req_2",
        ownerId: "user_seed",
        tenantId: "user_regular",
        terms: { summary: "Ya firmado", signedAt: "2026-07-01", startsAt: "2026-08-01", endsAt: "2026-12-31" },
        status: "active",
      },
    ]);
  });

  it("owner firma contrato draft → active", async () => {
    const res = await signContract({ contractId: "contract_draft", confirm: true }, ownerUser);
    expect((res as { status: string }).status).toBe("active");
    expect((res as { terms: { signedAt: string } }).terms.signedAt).toBeDefined();
  });

  it("tenant firma su propio contrato draft", async () => {
    const res = await signContract({ contractId: "contract_draft", confirm: true }, tenantUser);
    expect((res as { status: string }).status).toBe("active");
  });

  it("contrato active → firmar lanza error", async () => {
    try {
      await signContract({ contractId: "contract_active", confirm: true }, ownerUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("draft");
    }
  });

  it("usuario que NO es parte no puede firmar", async () => {
    try {
      await signContract({ contractId: "contract_draft", confirm: true }, outsiderUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("No autorizado");
    }
  });

  it("contrato inexistente lanza error", async () => {
    try {
      await signContract({ contractId: "contract_nonexistent", confirm: true }, ownerUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("no encontrado");
    }
  });

  it("admin puede firmar contratos de otros", async () => {
    const res = await signContract({ contractId: "contract_draft", confirm: true }, adminUser);
    expect((res as { status: string }).status).toBe("active");
  });

  it("sin confirmacion lanza error", async () => {
    try {
      await signContract({ contractId: "contract_draft" } as never, ownerUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("confirmar");
    }
  });

  it("confirm=false lanza error", async () => {
    try {
      await signContract({ contractId: "contract_draft", confirm: false }, ownerUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("confirmar");
    }
  });
});
