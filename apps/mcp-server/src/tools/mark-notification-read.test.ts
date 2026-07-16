import { describe, expect, it } from "bun:test";

import { markNotificationRead } from "./mark-notification-read";

describe("mark_notification_read tool (HU-91 #202)", () => {
  it("marca una notificación como leída", async () => {
    const result = await markNotificationRead({
      notificationId: "notif_seed_01",
      actingUserId: "user_seed",
      actingUserRole: "user",
    });
    expect(result).toBeDefined();
    expect((result as { read: boolean }).read).toBe(true);
    expect((result as { readAt: string }).readAt).toBeDefined();
  });

  it("lanza error cuando la notificación no existe", async () => {
    await expect(
      markNotificationRead({
        notificationId: "nonexistent",
        actingUserId: "user_seed",
        actingUserRole: "user",
      })
    ).rejects.toThrow("Notificación no encontrada");
  });

  it("lanza error cuando el usuario no es el propietario", async () => {
    await expect(
      markNotificationRead({
        notificationId: "notif_seed_03",
        actingUserId: "user_seed",
        actingUserRole: "user",
      })
    ).rejects.toThrow("No autorizado");
  });

  it("permite a un administrador marcar cualquier notificación", async () => {
    const result = await markNotificationRead({
      notificationId: "notif_seed_03",
      actingUserId: "user_admin",
      actingUserRole: "admin",
    });
    expect(result).toBeDefined();
    expect((result as { read: boolean }).read).toBe(true);
  });

  it("lanza error cuando no hay usuario autenticado", async () => {
    await expect(
      markNotificationRead({
        notificationId: "notif_seed_01",
        actingUserId: null,
        actingUserRole: "user",
      })
    ).rejects.toThrow("Se requiere un usuario autenticado");
  });

  it("no expone campos internos de Mongo (_id, __v)", async () => {
    const result = await markNotificationRead({
      notificationId: "notif_seed_01",
      actingUserId: "user_seed",
      actingUserRole: "user",
    });
    const notif = result as Record<string, unknown>;
    expect(notif).not.toHaveProperty("_id");
    expect(notif).not.toHaveProperty("__v");
  });
});
