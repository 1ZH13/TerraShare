import { describe, expect, it, beforeEach } from "bun:test";

import { Land, User } from "@backend/db/schemas";
import { updateLand } from "./update-land";

const ownerUser = { id: "user_seed", role: "user" };
const adminUser = { id: "user_admin", role: "admin" };
const regularUser = { id: "user_regular", role: "user" };

describe("update_land tool (HU-66 #183)", () => {
  beforeEach(async () => {
    await User.findOneAndUpdate(
      { clerkUserId: "user_seed" },
      { clerkUserId: "user_seed", email: "seed@test.com", role: "user", status: "active", profile: { fullName: "Seed Owner" } },
      { upsert: true },
    );
  });

  it("actualiza título de un terreno existente (owner)", async () => {
    const res = await updateLand({ landId: "land_a", title: "Finca Actualizada" }, ownerUser);
    expect((res as { title: string }).title).toBe("Finca Actualizada");
    expect((res as { id: string }).id).toBe("land_a");
  });

  it("actualiza precio mensual", async () => {
    const res = await updateLand({ landId: "land_a", priceRule: { currency: "USD", pricePerMonth: 999 } }, ownerUser);
    expect((res as { priceRule: { pricePerMonth: number } }).priceRule.pricePerMonth).toBe(999);
  });

  it("preserva id y ownerId (no se alteran)", async () => {
    const res = await updateLand({ landId: "land_a", title: "Nuevo" }, ownerUser);
    expect((res as { id: string }).id).toBe("land_a");
    expect((res as { ownerId: string }).ownerId).toBe("user_seed");
  });

  it("admin puede modificar terrenos de otros", async () => {
    const res = await updateLand({ landId: "land_a", title: "Admin Edit" }, adminUser);
    expect((res as { title: string }).title).toBe("Admin Edit");
  });

  it("usuario regular NO puede modificar terreno de otro", async () => {
    try {
      await updateLand({ landId: "land_a", title: "Hack" }, regularUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("No autorizado");
    }
  });

  it("terreno inexistente lanza error", async () => {
    try {
      await updateLand({ landId: "land_nonexistent", title: "Titulo valido" }, ownerUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("no encontrado");
    }
  });

  it("actualización parcial solo cambia campos provistos", async () => {
    const before = await Land.findOne({ id: "land_b" }).lean();
    const res = await updateLand({ landId: "land_b", title: "Solo título" }, ownerUser);
    expect((res as { title: string }).title).toBe("Solo título");
    expect((res as { area: number }).area).toBe(before!.area);
  });

  it("no expone _id ni __v", async () => {
    const res = await updateLand({ landId: "land_a", title: "Test" }, ownerUser);
    expect("_id" in res).toBe(false);
    expect("__v" in res).toBe(false);
  });
});
