import { describe, expect, it } from "bun:test";

import { getLand } from "./get-land";

describe("get_land tool (HU-64 #181)", () => {
  it("devuelve un terreno existente por ID", async () => {
    const result = await getLand({ landId: "land_a" });
    expect(result).toBeDefined();
    expect((result as { id: string }).id).toBe("land_a");
    expect((result as { title: string }).title).toBe("Finca agrícola en Chiriquí");
    expect((result as { location: { province: string } }).location.province).toBe("Chiriqui");
  });

  it("devuelve todos los campos esperados", async () => {
    const result = await getLand({ landId: "land_a" });
    const land = result as Record<string, unknown>;
    expect(land).toHaveProperty("id");
    expect(land).toHaveProperty("ownerId");
    expect(land).toHaveProperty("title");
    expect(land).toHaveProperty("area");
    expect(land).toHaveProperty("allowedUses");
    expect(land).toHaveProperty("location");
    expect(land).toHaveProperty("priceRule");
    expect(land).toHaveProperty("status");
    expect(land).toHaveProperty("operation");
  });

  it("lanza error cuando el terreno no existe", async () => {
    await expect(getLand({ landId: "nonexistent" })).rejects.toThrow("Terreno no encontrado");
  });

  it("lanza error cuando landId está vacío", async () => {
    await expect(getLand({ landId: "" })).rejects.toThrow();
  });

  it("no expone campos internos de Mongo (_id, __v)", async () => {
    const result = await getLand({ landId: "land_a" });
    const land = result as Record<string, unknown>;
    expect(land).not.toHaveProperty("_id");
    expect(land).not.toHaveProperty("__v");
  });

  it("lanza error cuando el terreno está inactivo", async () => {
    await expect(getLand({ landId: "land_inactive" })).rejects.toThrow("Terreno no encontrado");
  });
});
