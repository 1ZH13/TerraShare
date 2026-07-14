import { beforeEach, describe, expect, it } from "bun:test";

import mongoose from "@backend/db/mongoose";
import { AuditEvent, Contract, RentalRequest } from "@backend/db/schemas";
import { createContract } from "./create-contract";

// land_a lo posee "user_seed" (ver test-preload). Partes del contrato.
const OWNER = { id: "user_seed", role: "user" as const };
const ADMIN = { id: "user_admin", role: "admin" as const };
const OTHER = { id: "user_regular", role: "user" as const };

/** Términos válidos por defecto. */
function contractInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    rentalRequestId: "rr_seed",
    terms: {
      summary: "Arrendamiento por 12 meses del terreno.",
      startsAt: "2026-08-01",
      endsAt: "2027-08-01",
    },
    ...overrides,
  };
}

/**
 * Siembra solicitudes con el driver nativo (en beforeEach, NO en el cuerpo del
 * test): un write desde el cuerpo del test se traba con bun:test + memory-server
 * y cuelga la siguiente lectura de la tool.
 */
beforeEach(async () => {
  await RentalRequest.deleteMany({});
  await Contract.deleteMany({});
  await AuditEvent.deleteMany({});
  const rentalreqs = mongoose.connection.db!.collection("rentalrequests");
  await rentalreqs.insertMany([
    // Solicitud válida sobre land_a (dueño user_seed), arrendatario user_regular.
    { id: "rr_seed", landId: "land_a", tenantId: "user_regular", operation: "alquiler", status: "approved" },
    // Solicitud que apunta a un terreno inexistente.
    { id: "rr_noland", landId: "land_ghost", tenantId: "user_regular", operation: "alquiler", status: "approved" },
  ]);
});

describe("create_contract tool (HU-73 #190)", () => {
  it("el dueño crea un contrato en draft vinculado a la solicitud y con las partes", async () => {
    const contract = await createContract(contractInput(), OWNER);

    expect(contract.id).toMatch(/^contract_/);
    expect(contract.status).toBe("draft");
    expect(contract.rentalRequestId).toBe("rr_seed");
    expect(contract.ownerId).toBe("user_seed");
    expect(contract.tenantId).toBe("user_regular");
    expect(contract.terms.summary).toBe("Arrendamiento por 12 meses del terreno.");
    expect(contract.terms.startsAt).toBe("2026-08-01");
    expect(contract.terms.endsAt).toBe("2027-08-01");
  });

  it("persiste el contrato en Mongo (recuperable por id)", async () => {
    const contract = await createContract(contractInput(), OWNER);
    const stored = await Contract.findOne({ id: contract.id }).lean();
    expect(stored).not.toBeNull();
    expect((stored as { status: string }).status).toBe("draft");
    expect((stored as { ownerId: string }).ownerId).toBe("user_seed");
  });

  it("un admin también puede generar el contrato", async () => {
    const contract = await createContract(contractInput(), ADMIN);
    expect(contract.status).toBe("draft");
    expect(contract.ownerId).toBe("user_seed");
  });

  it("bloquea a quien no es dueño ni admin", async () => {
    await expect(createContract(contractInput(), OTHER)).rejects.toThrow(/dueño|admin/i);
  });

  it("falla si la solicitud no existe", async () => {
    await expect(
      createContract(contractInput({ rentalRequestId: "rr_inexistente" }), OWNER),
    ).rejects.toThrow(/solicitud no encontrada/i);
  });

  it("falla si el terreno de la solicitud no existe", async () => {
    await expect(
      createContract(contractInput({ rentalRequestId: "rr_noland" }), OWNER),
    ).rejects.toThrow(/terreno.*no encontrado/i);
  });

  it("registra un evento de auditoría (entity: contract, action: created)", async () => {
    const contract = await createContract(contractInput(), OWNER);
    const audit = await AuditEvent.findOne({ entityId: contract.id }).lean();
    expect(audit).not.toBeNull();
    expect((audit as { entity: string }).entity).toBe("contract");
    expect((audit as { action: string }).action).toBe("created");
    expect((audit as { actorId: string }).actorId).toBe("user_seed");
  });

  it("no expone campos internos de Mongo (_id, __v)", async () => {
    const contract = await createContract(contractInput(), OWNER);
    expect("_id" in contract).toBe(false);
    expect("__v" in contract).toBe(false);
  });

  it("rechaza un resumen demasiado corto (< 10 caracteres)", async () => {
    await expect(
      createContract(contractInput({ terms: { summary: "corto", startsAt: "2026-08-01", endsAt: "2027-08-01" } }), OWNER),
    ).rejects.toThrow();
  });

  it("rechaza fin anterior o igual al inicio", async () => {
    await expect(
      createContract(
        contractInput({ terms: { summary: "Arrendamiento por 12 meses.", startsAt: "2027-08-01", endsAt: "2026-08-01" } }),
        OWNER,
      ),
    ).rejects.toThrow();
  });

  it("rechaza cuando falta rentalRequestId", async () => {
    await expect(
      createContract({ terms: { summary: "Arrendamiento por 12 meses.", startsAt: "2026-08-01", endsAt: "2027-08-01" } }, OWNER),
    ).rejects.toThrow();
  });

  it("no crea nada en Mongo si la validación falla", async () => {
    const before = await Contract.countDocuments({});
    await expect(createContract(contractInput({ rentalRequestId: "" }), OWNER)).rejects.toThrow();
    expect(await Contract.countDocuments({})).toBe(before);
  });
});
