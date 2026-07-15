import { describe, expect, it } from "bun:test";

import { getContract } from "./get-contract";

describe("get_contract tool (HU-76 #193)", () => {
  it("devuelve un contrato existente por ID", async () => {
    const result = await getContract({
      contractId: "contract_seed_01",
      actingUserId: "user_owner_01",
    });
    expect(result).toBeDefined();
    expect((result as { id: string }).id).toBe("contract_seed_01");
    expect((result as { status: string }).status).toBe("draft");
    expect((result as { ownerId: string }).ownerId).toBe("user_owner_01");
    expect((result as { tenantId: string }).tenantId).toBe("user_tenant_01");
  });

  it("devuelve todos los campos esperados", async () => {
    const result = await getContract({
      contractId: "contract_seed_01",
      actingUserId: "user_owner_01",
    });
    const contract = result as Record<string, unknown>;
    expect(contract).toHaveProperty("id");
    expect(contract).toHaveProperty("rentalRequestId");
    expect(contract).toHaveProperty("ownerId");
    expect(contract).toHaveProperty("tenantId");
    expect(contract).toHaveProperty("terms");
    expect(contract).toHaveProperty("status");
    expect(contract).toHaveProperty("createdAt");
  });

  it("permite al arrendatario ver el contrato", async () => {
    const result = await getContract({
      contractId: "contract_seed_01",
      actingUserId: "user_tenant_01",
    });
    expect(result).toBeDefined();
    expect((result as { id: string }).id).toBe("contract_seed_01");
  });

  it("lanza error cuando el contrato no existe", async () => {
    await expect(
      getContract({
        contractId: "nonexistent",
        actingUserId: "user_owner_01",
      })
    ).rejects.toThrow("Contrato no encontrado");
  });

  it("permite a un administrador ver contratos que no le pertenecen", async () => {
    const result = await getContract({
      contractId: "contract_seed_01",
      actingUserId: "user_admin",
      actingUserRole: "admin",
    });
    expect(result).toBeDefined();
    expect((result as { id: string }).id).toBe("contract_seed_01");
  });

  it("lanza error cuando el usuario no es parte del contrato ni administrador", async () => {
    await expect(
      getContract({
        contractId: "contract_seed_01",
        actingUserId: "user_other",
        actingUserRole: "user",
      })
    ).rejects.toThrow("No autorizado");
  });

  it("lanza error cuando no hay usuario autenticado", async () => {
    await expect(
      getContract({
        contractId: "contract_seed_01",
        actingUserId: null,
      })
    ).rejects.toThrow("Se requiere un usuario autenticado");
  });

  it("no expone campos internos de Mongo (_id, __v)", async () => {
    const result = await getContract({
      contractId: "contract_seed_01",
      actingUserId: "user_owner_01",
    });
    const contract = result as Record<string, unknown>;
    expect(contract).not.toHaveProperty("_id");
    expect(contract).not.toHaveProperty("__v");
  });

  it("incluye los términos del contrato", async () => {
    const result = await getContract({
      contractId: "contract_seed_01",
      actingUserId: "user_owner_01",
    });
    const terms = (result as { terms: Record<string, unknown> }).terms;
    expect(terms).toHaveProperty("summary");
    expect(terms).toHaveProperty("startsAt");
    expect(terms).toHaveProperty("endsAt");
  });
});
