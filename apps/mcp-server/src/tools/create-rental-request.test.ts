import { beforeEach, describe, expect, it } from "bun:test";

import mongoose from "@backend/db/mongoose";
import { AuditEvent, RentalRequest } from "@backend/db/schemas";
import { createRentalRequest } from "./create-rental-request";

const TENANT = "user_regular";

/**
 * Siembra una solicitud pre-existente con el driver nativo (como el preload del
 * backend). Un `Model.create` de Mongoose desde el cuerpo del test se traba con
 * bun:test + mongodb-memory-server y cuelga la siguiente lectura.
 */
async function seedRental(doc: Record<string, unknown>): Promise<void> {
  await mongoose.connection.db!.collection("rentalrequests").insertOne({
    landId: "land_a",
    tenantId: "user_other",
    operation: "alquiler",
    status: "approved",
    ...doc,
  });
}

/** Entrada de alquiler válida por defecto (land_a admite 'agricultura'). */
function rentalInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    landId: "land_a",
    period: { startDate: "2026-08-01", endDate: "2026-12-01" },
    intendedUse: "agricultura",
    ...overrides,
  };
}

// El preload no limpia RentalRequest/AuditEvent entre tests → aislamos aquí.
beforeEach(async () => {
  await RentalRequest.deleteMany({});
  await AuditEvent.deleteMany({});
});

describe("create_rental_request tool (HU-70 #187)", () => {
  it("crea una solicitud de alquiler en pending_owner a nombre del arrendatario", async () => {
    const rr = await createRentalRequest(rentalInput(), TENANT);

    expect(rr.id).toMatch(/^rr_/);
    expect(rr.tenantId).toBe(TENANT);
    expect(rr.operation).toBe("alquiler");
    expect(rr.status).toBe("pending_owner");
    expect(rr.period).toEqual({ startDate: "2026-08-01", endDate: "2026-12-01" });
    expect(rr.intendedUse).toBe("agricultura");
  });

  it("persiste la solicitud en Mongo (recuperable por id)", async () => {
    const rr = await createRentalRequest(rentalInput(), TENANT);
    const stored = await RentalRequest.findOne({ id: rr.id }).lean();
    expect(stored).not.toBeNull();
    expect((stored as { status: string }).status).toBe("pending_owner");
  });

  it("crea una solicitud de compra (venta) con offerAmount", async () => {
    const rr = await createRentalRequest(
      { landId: "land_b", operation: "venta", offerAmount: 90000 },
      TENANT,
    );
    expect(rr.operation).toBe("venta");
    expect(rr.offerAmount).toBe(90000);
    expect(rr.status).toBe("pending_owner");
    expect(rr.period).toBeUndefined();
  });

  it("registra un evento de auditoría (entity: rental_request, action: created)", async () => {
    const rr = await createRentalRequest(rentalInput(), TENANT);
    const audit = await AuditEvent.findOne({ entityId: rr.id }).lean();
    expect(audit).not.toBeNull();
    expect((audit as { entity: string }).entity).toBe("rental_request");
    expect((audit as { action: string }).action).toBe("created");
    expect((audit as { actorId: string }).actorId).toBe(TENANT);
  });

  it("no expone campos internos de Mongo (_id, __v)", async () => {
    const rr = await createRentalRequest(rentalInput(), TENANT);
    expect("_id" in rr).toBe(false);
    expect("__v" in rr).toBe(false);
  });

  it("bloquea si el solicitante es el dueño del terreno", async () => {
    // land_a lo posee "user_seed"; si ese mismo usuario solicita, se bloquea.
    await expect(
      createRentalRequest(rentalInput({ landId: "land_a" }), "user_seed"),
    ).rejects.toThrow(/dueño/i);
  });

  it("falla si el terreno no existe", async () => {
    await expect(
      createRentalRequest(rentalInput({ landId: "land_inexistente" }), TENANT),
    ).rejects.toThrow(/no encontrado/i);
  });

  it("rechaza una operación no admitida por el terreno (venta sobre terreno de alquiler)", async () => {
    await expect(
      createRentalRequest({ landId: "land_a", operation: "venta", offerAmount: 1000 }, TENANT),
    ).rejects.toThrow(/no admite la operación/i);
  });

  it("rechaza un uso no permitido por el terreno", async () => {
    await expect(
      createRentalRequest(rentalInput({ intendedUse: "ganaderia" }), TENANT),
    ).rejects.toThrow(/no está permitido/i);
  });

  // Nota: el terreno con una solicitud aprobada pre-existente se siembra en un
  // beforeEach (no en el cuerpo del test). Un write desde el cuerpo del test,
  // seguido de la lectura de la tool, se traba con bun:test + mongodb-memory-server;
  // sembrar en el hook (como hace el preload del backend) lo evita.
  describe("con una solicitud aprobada pre-existente en land_a (2026-09-01..10-01)", () => {
    beforeEach(async () => {
      await seedRental({
        id: "rr_existing",
        period: { startDate: "2026-09-01", endDate: "2026-10-01" },
      });
    });

    it("bloquea un período que solapa", async () => {
      await expect(
        createRentalRequest(rentalInput({ period: { startDate: "2026-08-01", endDate: "2026-12-01" } }), TENANT),
      ).rejects.toThrow(/solapa/i);
    });

    it("permite un período que no solapa (posterior)", async () => {
      const rr = await createRentalRequest(
        rentalInput({ period: { startDate: "2026-11-01", endDate: "2026-12-01" } }),
        TENANT,
      );
      expect(rr.status).toBe("pending_owner");
    });
  });

  it("rechaza alquiler sin período (validación del schema)", async () => {
    await expect(
      createRentalRequest({ landId: "land_a", intendedUse: "agricultura" }, TENANT),
    ).rejects.toThrow();
  });

  it("rechaza alquiler sin intendedUse (validación del schema)", async () => {
    await expect(
      createRentalRequest(
        { landId: "land_a", period: { startDate: "2026-08-01", endDate: "2026-12-01" } },
        TENANT,
      ),
    ).rejects.toThrow();
  });

  it("rechaza un período con fin anterior o igual al inicio", async () => {
    await expect(
      createRentalRequest(
        rentalInput({ period: { startDate: "2026-12-01", endDate: "2026-08-01" } }),
        TENANT,
      ),
    ).rejects.toThrow();
  });

  it("rechaza venta sin offerAmount (validación del schema)", async () => {
    await expect(
      createRentalRequest({ landId: "land_b", operation: "venta" }, TENANT),
    ).rejects.toThrow();
  });

  it("no crea nada en Mongo si la validación falla", async () => {
    const before = await RentalRequest.countDocuments({});
    await expect(
      createRentalRequest({ landId: "land_a" }, TENANT),
    ).rejects.toThrow();
    expect(await RentalRequest.countDocuments({})).toBe(before);
  });
});
