import { describe, expect, it, beforeEach } from "bun:test";

import { Land } from "@backend/db/schemas";
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

// Follow-up soft-delete (#328): un terreno con `deletedAt` no debe encontrarse.
// El terreno se siembra en beforeEach (write) y el test solo lee, para evitar el
// patrón write-then-read en el cuerpo (que cuelga con bun:test + memory-server).
describe("get_land — filtro soft-delete (#328 follow-up)", () => {
  beforeEach(async () => {
    await Land.create({
      id: "land_gone",
      ownerId: "user_seed",
      title: "Terreno retirado",
      area: 5,
      allowedUses: ["agricultura"],
      location: { province: "Panama", district: "Panama" },
      priceRule: { currency: "USD", pricePerMonth: 100 },
      status: "inactive",
      operation: "alquiler",
      deletedAt: new Date(),
    });
  });

  it("no encuentra un terreno con soft-delete", async () => {
    await expect(getLand({ landId: "land_gone" })).rejects.toThrow(/no encontrado/i);
  });
});
