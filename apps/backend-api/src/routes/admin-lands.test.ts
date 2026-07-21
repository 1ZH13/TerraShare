import { describe, expect, it, beforeEach } from "bun:test";

import { requestJson } from "../lib/http-test-utils";
import { Land } from "../db/schemas";

/**
 * Contrato del listado de terrenos del panel (#370).
 *
 * La tabla del panel tiene una columna «Uso» que se quedó vacía en todas las
 * filas durante meses porque el endpoint no proyectaba `allowedUses`: la
 * interfaz pedía un campo que la respuesta nunca traía, y nada lo detectaba.
 * Estas pruebas fijan la forma de la respuesta y el comportamiento de su
 * paginación para que no vuelva a desincronizarse en silencio.
 *
 * Gotcha de bun:test + mongodb-memory-server: lo que se escribe va en
 * `beforeEach` y el cuerpo del test solo lee.
 */

const adminHeaders = { "x-dev-user-id": "user_admin_lands", "x-dev-role": "admin" };

describe("GET /admin/lands — forma de la respuesta", () => {
  beforeEach(async () => {
    await Land.create({
      id: "land_admin_shape",
      ownerId: "user_owner_shape",
      title: "Finca de contrato",
      area: 30,
      allowedUses: ["ganaderia", "agricultura"],
      location: { province: "Coclé", district: "Penonomé" },
      priceRule: { currency: "USD", pricePerMonth: 800 },
      status: "active",
      operation: "alquiler",
    });
  });

  it("incluye allowedUses, que es lo que pinta la columna «Uso» del panel", async () => {
    const { response, payload } = await requestJson("/api/v1/admin/lands", { headers: adminHeaders });
    expect(response.status).toBe(200);

    const item = (payload.data.items as { id: string; allowedUses?: string[] }[])
      .find((l) => l.id === "land_admin_shape");

    expect(item).toBeDefined();
    expect(item!.allowedUses).toEqual(["ganaderia", "agricultura"]);
  });

  it("trae los campos que la tabla necesita para cada fila", async () => {
    const { payload } = await requestJson("/api/v1/admin/lands", { headers: adminHeaders });
    const item = (payload.data.items as Record<string, unknown>[])
      .find((l) => l.id === "land_admin_shape")!;

    for (const field of ["id", "ownerId", "ownerEmail", "title", "status", "allowedUses", "createdAt"]) {
      expect(`${field}:${field in item}`).toBe(`${field}:true`);
    }
  });

  it("declara el total real, no solo lo que cabe en la página", async () => {
    const { payload } = await requestJson("/api/v1/admin/lands?pageSize=1", { headers: adminHeaders });

    expect((payload.data.items as unknown[]).length).toBe(1);
    // Si el panel se fiara solo de `items.length`, diría que hay un terreno.
    expect(payload.data.total).toBeGreaterThan(1);
    expect(payload.data.pagination.totalPages).toBeGreaterThan(1);
  });

  it("admite pedir una página mayor que la de por defecto", async () => {
    // La pantalla de moderación pide 100 porque no tiene paginador: sin esto,
    // los terrenos a partir del 21 quedaban fuera de su alcance.
    const { payload } = await requestJson("/api/v1/admin/lands?pageSize=100", { headers: adminHeaders });

    expect((payload.data.items as unknown[]).length).toBe(payload.data.total);
  });

  it("no lo puede consultar quien no es admin", async () => {
    const { response } = await requestJson("/api/v1/admin/lands", {
      headers: { "x-dev-user-id": "user_plain" },
    });
    expect(response.status).toBe(403);
  });
});
