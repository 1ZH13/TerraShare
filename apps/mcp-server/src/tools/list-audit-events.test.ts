import { describe, expect, it } from "bun:test";
import { listAuditEvents } from "./list-audit-events";

describe("list_audit_events tool (HU-92 #209)", () => {
  it("devuelve todos los eventos para un administrador", async () => {
    const result = await listAuditEvents({
      actingUserId: "user_admin",
      actingUserRole: "admin",
    });
    const events = (result as { items: unknown[] }).items;
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
  });

  it("lanza error cuando el usuario no es administrador", async () => {
    await expect(
      listAuditEvents({
        actingUserId: "user_regular",
        actingUserRole: "user",
      })
    ).rejects.toThrow("No autorizado");
  });

  it("filtra por entity", async () => {
    const result = await listAuditEvents({
      actingUserId: "user_admin",
      actingUserRole: "admin",
      entity: "land",
    });
    const events = (result as { items: { entity: string }[] }).items;
    expect(events.every((e) => e.entity === "land")).toBe(true);
  });

  it("filtra por action", async () => {
    const result = await listAuditEvents({
      actingUserId: "user_admin",
      actingUserRole: "admin",
      action: "created",
    });
    const events = (result as { items: { action: string }[] }).items;
    expect(events.every((e) => e.action === "created")).toBe(true);
  });

  it("lanza error cuando no hay usuario autenticado", async () => {
    await expect(
      listAuditEvents({
        actingUserId: null,
        actingUserRole: "user",
      })
    ).rejects.toThrow("Se requiere un usuario autenticado");
  });

  it("no expone campos internos de Mongo", async () => {
    const result = await listAuditEvents({
      actingUserId: "user_admin",
      actingUserRole: "admin",
    });
    const events = (result as { items: Record<string, unknown>[] }).items;
    expect(events.every((e) => !("_id" in e) && !("__v" in e))).toBe(true);
  });

  it("ordena por fecha de creación descendente", async () => {
    const result = await listAuditEvents({
      actingUserId: "user_admin",
      actingUserRole: "admin",
    });
    const events = (result as { items: { createdAt: Date }[] }).items;
    expect(events.length).toBeGreaterThan(1);
    expect(new Date(events[0].createdAt).getTime()).toBeGreaterThanOrEqual(
      new Date(events[1].createdAt).getTime()
    );
  });

  it("incluye campos relevantes en cada evento", async () => {
    const result = await listAuditEvents({
      actingUserId: "user_admin",
      actingUserRole: "admin",
    });
    const events = (result as { items: Record<string, unknown>[] }).items;
    expect(events.length).toBeGreaterThan(0);
    const event = events[0];
    expect(event).toHaveProperty("id");
    expect(event).toHaveProperty("actorId");
    expect(event).toHaveProperty("entity");
    expect(event).toHaveProperty("action");
    expect(event).toHaveProperty("entityId");
    expect(event).toHaveProperty("createdAt");
  });
});
