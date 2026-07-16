import { describe, expect, it } from "bun:test";

import { listNotifications } from "./list-notifications";

describe("list_notifications tool (HU-90 #202)", () => {
  it("devuelve notificaciones del usuario autenticado", async () => {
    const result = await listNotifications({
      actingUserId: "user_seed",
      actingUserRole: "user",
    });
    const notifs = (result as { items: unknown[] }).items;
    expect(Array.isArray(notifs)).toBe(true);
    expect(notifs.length).toBe(2);
    expect(notifs.every((n: unknown) => (n as { userId: string }).userId === "user_seed")).toBe(true);
  });

  it("permite a un administrador ver todas las notificaciones", async () => {
    const result = await listNotifications({
      actingUserId: "user_admin",
      actingUserRole: "admin",
    });
    const notifs = (result as { items: unknown[] }).items;
    expect(Array.isArray(notifs)).toBe(true);
    expect(notifs.length).toBeGreaterThan(0);
  });

  it("filtra por unreadOnly", async () => {
    const result = await listNotifications({
      actingUserId: "user_seed",
      actingUserRole: "user",
      unreadOnly: true,
    });
    const notifs = (result as { items: { read: boolean }[] }).items;
    expect(notifs.every((n) => n.read === false)).toBe(true);
  });

  it("devuelve array vacío si el usuario no tiene notificaciones", async () => {
    const result = await listNotifications({
      actingUserId: "user_no_notifs",
      actingUserRole: "user",
    });
    const notifs = (result as { items: unknown[] }).items;
    expect(notifs.length).toBe(0);
  });

  it("no expone campos internos de Mongo (_id, __v)", async () => {
    const result = await listNotifications({
      actingUserId: "user_seed",
      actingUserRole: "user",
    });
    const notifs = (result as { items: Record<string, unknown>[] }).items;
    expect(notifs.every((n) => !("_id" in n) && !("__v" in n))).toBe(true);
  });

  it("lanza error cuando no hay usuario autenticado", async () => {
    await expect(
      listNotifications({
        actingUserId: null,
        actingUserRole: "user",
      })
    ).rejects.toThrow("Se requiere un usuario autenticado");
  });

  it("incluye campos relevantes en cada notificación", async () => {
    const result = await listNotifications({
      actingUserId: "user_seed",
      actingUserRole: "user",
    });
    const notifs = (result as { items: Record<string, unknown>[] }).items;
    expect(notifs.length).toBeGreaterThan(0);
    const notif = notifs[0];
    expect(notif).toHaveProperty("id");
    expect(notif).toHaveProperty("userId");
    expect(notif).toHaveProperty("type");
    expect(notif).toHaveProperty("title");
    expect(notif).toHaveProperty("read");
    expect(notif).toHaveProperty("createdAt");
  });
});
