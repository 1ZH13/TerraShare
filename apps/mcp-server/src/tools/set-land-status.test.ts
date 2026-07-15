import { describe, expect, it } from "bun:test";

import { setLandStatus } from "./set-land-status";

describe("set_land_status tool (HU-67 #184)", () => {
  it("cambia el estado de un terreno a active", async () => {
    const result = await setLandStatus({
      landId: "land_a",
      status: "active",
      actingUserId: "user_seed",
    });
    expect(result).toBeDefined();
    expect((result as { id: string }).id).toBe("land_a");
    expect((result as { status: string }).status).toBe("active");
  });

  it("cambia el estado de un terreno a inactive", async () => {
    const result = await setLandStatus({
      landId: "land_a",
      status: "inactive",
      actingUserId: "user_seed",
    });
    expect(result).toBeDefined();
    expect((result as { id: string }).id).toBe("land_a");
    expect((result as { status: string }).status).toBe("inactive");
  });

  it("cambia el estado de un terreno a draft", async () => {
    const result = await setLandStatus({
      landId: "land_a",
      status: "draft",
      actingUserId: "user_seed",
    });
    expect(result).toBeDefined();
    expect((result as { id: string }).id).toBe("land_a");
    expect((result as { status: string }).status).toBe("draft");
  });

  it("lanza error cuando el terreno no existe", async () => {
    await expect(
      setLandStatus({
        landId: "nonexistent",
        status: "active",
        actingUserId: "user_seed",
      })
    ).rejects.toThrow("Terreno no encontrado");
  });

  it("permite a un administrador modificar terrenos que no posee", async () => {
    const result = await setLandStatus({
      landId: "land_a",
      status: "inactive",
      actingUserId: "user_admin",
      actingUserRole: "admin",
    });
    expect(result).toBeDefined();
    expect((result as { id: string }).id).toBe("land_a");
    expect((result as { status: string }).status).toBe("inactive");
  });

  it("lanza error cuando el usuario no es el dueño ni administrador", async () => {
    await expect(
      setLandStatus({
        landId: "land_a",
        status: "active",
        actingUserId: "user_other",
        actingUserRole: "user",
      })
    ).rejects.toThrow("No autorizado");
  });

  it("lanza error cuando el estado no es válido (validación Zod)", async () => {
    // Note: Invalid status is caught by Zod validation at the SDK level
    // This test verifies the input schema rejects invalid values
    const { setLandStatusInput } = await import("./set-land-status");
    const { z } = await import("zod");
    const schema = z.object(setLandStatusInput);
    expect(() => schema.parse({ landId: "land_a", status: "invalid_status" })).toThrow();
  });

  it("lanza error cuando no hay usuario autenticado", async () => {
    await expect(
      setLandStatus({
        landId: "land_a",
        status: "active",
        actingUserId: null,
      })
    ).rejects.toThrow("Se requiere un usuario autenticado");
  });

  it("actualiza el campo updatedAt", async () => {
    const before = new Date().toISOString();
    const result = await setLandStatus({
      landId: "land_b",
      status: "inactive",
      actingUserId: "user_seed",
    });
    const updatedAt = (result as { updatedAt: string }).updatedAt;
    expect(new Date(updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
  });
});
