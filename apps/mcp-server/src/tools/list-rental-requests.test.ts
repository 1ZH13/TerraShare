import { describe, expect, it } from "bun:test";

import { listRentalRequests } from "./list-rental-requests";

describe("list_rental_requests tool (HU-71 #188)", () => {
  it("devuelve solicitudes del arrendatario", async () => {
    const result = await listRentalRequests({
      actingUserId: "user_tenant_01",
      status: undefined,
    });
    const requests = (result as { items: unknown[] }).items;
    expect(Array.isArray(requests)).toBe(true);
    // user_tenant_01 should see their own requests
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every((r: unknown) => (r as { tenantId: string }).tenantId === "user_tenant_01")).toBe(true);
  });

  it("devuelve solicitudes del dueño", async () => {
    const result = await listRentalRequests({
      actingUserId: "user_seed",
      status: undefined,
    });
    const requests = (result as { items: unknown[] }).items;
    expect(Array.isArray(requests)).toBe(true);
    // user_seed owns land_a which has rental requests
    expect(requests.length).toBeGreaterThan(0);
  });

  it("filtra por estado", async () => {
    const result = await listRentalRequests({
      actingUserId: "user_tenant_01",
      status: "pending_owner",
    });
    const requests = (result as { items: { status: string }[] }).items;
    expect(Array.isArray(requests)).toBe(true);
    expect(requests.every((r) => r.status === "pending_owner")).toBe(true);
  });

  it("devuelve array vacío si el usuario no tiene solicitudes", async () => {
    const result = await listRentalRequests({
      actingUserId: "user_no_requests",
      status: undefined,
    });
    const requests = (result as { items: unknown[] }).items;
    expect(Array.isArray(requests)).toBe(true);
    expect(requests.length).toBe(0);
  });

  it("no expone campos internos de Mongo (_id, __v)", async () => {
    const result = await listRentalRequests({
      actingUserId: "user_tenant_01",
      status: undefined,
    });
    const requests = (result as { items: Record<string, unknown>[] }).items;
    expect(requests.every((r) => !("_id" in r) && !("__v" in r))).toBe(true);
  });

  it("lanza error si no hay usuario autenticado", async () => {
    await expect(
      listRentalRequests({
        actingUserId: null,
        status: undefined,
      })
    ).rejects.toThrow("Se requiere un usuario autenticado");
  });

  it("incluye campos relevantes en cada solicitud", async () => {
    const result = await listRentalRequests({
      actingUserId: "user_tenant_01",
      status: undefined,
    });
    const requests = (result as { items: Record<string, unknown>[] }).items;
    expect(requests.length).toBeGreaterThan(0);
    const request = requests[0];
    expect(request).toHaveProperty("id");
    expect(request).toHaveProperty("landId");
    expect(request).toHaveProperty("tenantId");
    expect(request).toHaveProperty("status");
    expect(request).toHaveProperty("createdAt");
  });
});
