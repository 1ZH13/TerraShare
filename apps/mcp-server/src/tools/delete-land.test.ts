import { describe, expect, it, beforeEach } from "bun:test";

import { Land, User } from "@backend/db/schemas";
import { deleteLand } from "./delete-land";

const ownerUser = { id: "user_seed", role: "user" };
const adminUser = { id: "user_admin", role: "admin" };
const regularUser = { id: "user_regular", role: "user" };

describe("delete_land tool (HU-69 #186)", () => {
  beforeEach(async () => {
    await User.findOneAndUpdate(
      { clerkUserId: "user_seed" },
      { clerkUserId: "user_seed", email: "seed@test.com", role: "user", status: "active", profile: { fullName: "Seed Owner" } },
      { upsert: true },
    );
  });

  it("elimina un terreno existente con confirmación", async () => {
    const res = await deleteLand({ landId: "land_a", confirm: true }, ownerUser);
    expect(res).toEqual({ deleted: true, landId: "land_a" });
    const gone = await Land.findOne({ id: "land_a" }).lean();
    expect(gone).toBeNull();
  });

  it("admin puede eliminar terrenos de otros", async () => {
    const res = await deleteLand({ landId: "land_b", confirm: true }, adminUser);
    expect(res).toEqual({ deleted: true, landId: "land_b" });
  });

  it("sin confirm lanza error", async () => {
    try {
      await deleteLand({ landId: "land_a" } as never, ownerUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("confirmar");
    }
  });

  it("confirm=false lanza error", async () => {
    try {
      await deleteLand({ landId: "land_a", confirm: false }, ownerUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("confirmar");
    }
  });

  it("usuario regular NO puede eliminar terreno de otro", async () => {
    try {
      await deleteLand({ landId: "land_a", confirm: true }, regularUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("No autorizado");
    }
  });

  it("terreno inexistente lanza error", async () => {
    try {
      await deleteLand({ landId: "land_nonexistent", confirm: true }, ownerUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("no encontrado");
    }
  });
});
