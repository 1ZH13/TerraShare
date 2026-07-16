import { describe, expect, it } from "bun:test";
import { getLand } from "./get-land";

describe("get_land tool (HU-64 #181)", () => {
  it("devuelve la ficha completa de un terreno existente", async () => {
    const result = await getLand({ landId: "land_a" });
    expect(result).toBeDefined();
    expect((result as { id: string }).id).toBe("land_a");
    expect((result as { title: string }).title).toBe("Finca agrícola en Chiriquí");
  });

  it("incluye ubicación, área, usos y precio (criterios HU-64)", async () => {
    const result = await getLand({ landId: "land_a" });
    const land = result as Record<string, unknown>;
    expect(land).toHaveProperty("location");
    expect(land).toHaveProperty("area");
    expect(land).toHaveProperty("allowedUses");
    expect(land).toHaveProperty("priceRule");
    expect((land.location as { province: string }).province).toBe("Chiriqui");
    expect(land.allowedUses).toEqual(["agricultura"]);
    expect((land.priceRule as { pricePerMonth: number }).pricePerMonth).toBe(300);
  });

  it("lanza error controlado cuando el terreno no existe", async () => {
    await expect(getLand({ landId: "nonexistent" })).rejects.toThrow("Terreno no encontrado");
  });

  it("lanza error de validación cuando falta el landId", async () => {
    await expect(getLand({})).rejects.toThrow();
  });

  it("no expone campos internos de Mongo (_id, __v)", async () => {
    const result = await getLand({ landId: "land_a" });
    const land = result as Record<string, unknown>;
    expect(land).not.toHaveProperty("_id");
    expect(land).not.toHaveProperty("__v");
  });
});
