import { describe, expect, it } from "bun:test";

import { listMyLands } from "./list-my-lands";

describe("list_my_lands tool (HU-68 #185)", () => {
  it("devuelve solo los terrenos del dueño autenticado", async () => {
    const result = await listMyLands({ actingUserId: "user_seed" });
    expect(result).toBeDefined();
    const lands = (result as { items: unknown[] }).items;
    expect(Array.isArray(lands)).toBe(true);
    // user_seed owns all 4 lands (land_a, land_b, land_c, land_inactive) from test-preload.ts
    expect(lands.length).toBe(4);
    expect(lands.every((l: unknown) => (l as { ownerId: string }).ownerId === "user_seed")).toBe(true);
  });

  it("devuelve terrenos con estado y métricas básicas", async () => {
    const result = await listMyLands({ actingUserId: "user_seed" });
    const lands = (result as { items: Record<string, unknown>[] }).items;
    expect(lands.length).toBeGreaterThan(0);
    const land = lands[0];
    expect(land).toHaveProperty("id");
    expect(land).toHaveProperty("title");
    expect(land).toHaveProperty("status");
    expect(land).toHaveProperty("area");
    expect(land).toHaveProperty("priceRule");
    expect(land).toHaveProperty("location");
  });

  it("devuelve array vacío si el usuario no tiene terrenos", async () => {
    const result = await listMyLands({ actingUserId: "user_no_lands" });
    const lands = (result as { items: unknown[] }).items;
    expect(Array.isArray(lands)).toBe(true);
    expect(lands.length).toBe(0);
  });

  it("no expone campos internos de Mongo (_id, __v)", async () => {
    const result = await listMyLands({ actingUserId: "user_seed" });
    const lands = (result as { items: Record<string, unknown>[] }).items;
    expect(lands.every((l) => !("_id" in l) && !("__v" in l))).toBe(true);
  });

  it("incluye terrenos inactivos del dueño", async () => {
    const result = await listMyLands({ actingUserId: "user_seed" });
    const lands = (result as { items: { id: string; status: string }[] }).items;
    expect(lands.some((l) => l.id === "land_inactive" && l.status === "inactive")).toBe(true);
  });

  it("lanza error si no hay usuario autenticado", async () => {
    await expect(listMyLands({ actingUserId: null })).rejects.toThrow("Se requiere un usuario autenticado");
  });
});
