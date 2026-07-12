import { describe, expect, it } from "bun:test";

import { AuditEvent, Land } from "@backend/db/schemas";
import { createLand } from "./create-land";

const OWNER = "user_regular";

/** Entrada válida mínima; se puede sobreescribir por caso. */
function validInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: "Finca agrícola en Boquete",
    area: 12000,
    allowedUses: ["agricultura"],
    location: { province: "Chiriqui", district: "Boquete" },
    priceRule: { currency: "USD", pricePerMonth: 750 },
    ...overrides,
  };
}

describe("create_land tool (HU-65 #182)", () => {
  it("crea un terreno en draft a nombre del usuario que actúa", async () => {
    const land = await createLand(validInput(), OWNER);

    expect(land.id).toMatch(/^land_/);
    expect(land.ownerId).toBe(OWNER);
    expect(land.status).toBe("draft");
    expect(land.title).toBe("Finca agrícola en Boquete");
  });

  it("persiste el terreno en Mongo (recuperable por id)", async () => {
    const land = await createLand(validInput(), OWNER);

    const stored = await Land.findOne({ id: land.id }).lean();
    expect(stored).not.toBeNull();
    expect((stored as { status: string }).status).toBe("draft");
    expect((stored as { ownerId: string }).ownerId).toBe(OWNER);
  });

  it("aplica los valores por defecto (operation, photos, features, availability)", async () => {
    const land = await createLand(validInput(), OWNER);

    expect(land.operation).toBe("alquiler");
    expect(land.photos).toEqual([]);
    expect(land.features).toEqual([]);
    expect(land.availability).toEqual({});
  });

  it("respeta operation/salePrice/water/access/features cuando se proveen", async () => {
    const land = await createLand(
      validInput({
        operation: "venta",
        salePrice: 90000,
        water: "pozo",
        access: "carretera",
        features: ["cercado", "luz"],
      }),
      OWNER,
    );

    expect(land.operation).toBe("venta");
    expect(land.salePrice).toBe(90000);
    expect(land.water).toBe("pozo");
    expect(land.access).toBe("carretera");
    expect(land.features).toEqual(["cercado", "luz"]);
  });

  it("fija timestamps ISO createdAt === updatedAt en la creación", async () => {
    const land = await createLand(validInput(), OWNER);

    expect(land.createdAt).toBe(land.updatedAt);
    expect(() => new Date(land.createdAt).toISOString()).not.toThrow();
  });

  it("registra un evento de auditoría (entity: land, action: created)", async () => {
    const land = await createLand(validInput(), OWNER);

    const audit = await AuditEvent.findOne({ entityId: land.id }).lean();
    expect(audit).not.toBeNull();
    expect((audit as { entity: string }).entity).toBe("land");
    expect((audit as { action: string }).action).toBe("created");
    expect((audit as { actorId: string }).actorId).toBe(OWNER);
  });

  it("no expone campos internos de Mongo (_id, __v)", async () => {
    const land = await createLand(validInput(), OWNER);

    expect("_id" in land).toBe(false);
    expect("__v" in land).toBe(false);
  });

  it("rechaza título demasiado corto", async () => {
    await expect(createLand(validInput({ title: "ab" }), OWNER)).rejects.toThrow();
  });

  it("rechaza área no positiva", async () => {
    await expect(createLand(validInput({ area: 0 }), OWNER)).rejects.toThrow();
  });

  it("rechaza cuando no hay usos permitidos", async () => {
    await expect(createLand(validInput({ allowedUses: [] }), OWNER)).rejects.toThrow();
  });

  it("rechaza un uso permitido inválido", async () => {
    await expect(
      createLand(validInput({ allowedUses: ["mineria"] }), OWNER),
    ).rejects.toThrow();
  });

  it("rechaza ubicación sin provincia/distrito", async () => {
    await expect(
      createLand(validInput({ location: { province: "", district: "" } }), OWNER),
    ).rejects.toThrow();
  });

  it("rechaza precio mensual no positivo", async () => {
    await expect(
      createLand(validInput({ priceRule: { currency: "USD", pricePerMonth: 0 } }), OWNER),
    ).rejects.toThrow();
  });

  it("no crea nada en Mongo si la validación falla", async () => {
    const before = await Land.countDocuments({});
    await expect(createLand(validInput({ title: "x" }), OWNER)).rejects.toThrow();
    const after = await Land.countDocuments({});
    expect(after).toBe(before);
  });
});
