import { beforeEach, describe, expect, it } from "bun:test";

import { AuditEvent, Notification, User } from "@backend/db/schemas";
import { manageUserStatus, manageUserStatusPreview } from "./manage-user-status";

const ADMIN = { id: "user_admin", role: "admin" as const };

// El preload siembra user_admin/user_regular/user_blocked y los reinicia en cada
// test. Solo limpiamos AuditEvent (que el preload no toca).
beforeEach(async () => {
  await AuditEvent.deleteMany({});
});

describe("manage_user_status tool (HU-91 #208)", () => {
  it("bloquea una cuenta activa", async () => {
    const res = await manageUserStatus(
      { userId: "user_regular", status: "blocked", confirm: true },
      ADMIN,
    );
    expect(res.userId).toBe("user_regular");
    expect(res.previousStatus).toBe("active");
    expect(res.status).toBe("blocked");
  });

  it("persiste el nuevo estado en Mongo", async () => {
    await manageUserStatus({ userId: "user_regular", status: "blocked", confirm: true }, ADMIN);
    const user = await User.findOne({ clerkUserId: "user_regular" }).lean();
    expect((user as { status: string }).status).toBe("blocked");
  });

  it("reactiva una cuenta bloqueada", async () => {
    const res = await manageUserStatus(
      { userId: "user_blocked", status: "active", confirm: true },
      ADMIN,
    );
    expect(res.previousStatus).toBe("blocked");
    expect(res.status).toBe("active");
  });

  it("no permite modificar la propia cuenta", async () => {
    await expect(
      manageUserStatus({ userId: "user_admin", status: "blocked", confirm: true }, ADMIN),
    ).rejects.toThrow(/propia cuenta/i);
  });

  it("capa B: manageUserStatusPreview resume el cambio sin ejecutarlo", async () => {
    const preview = await manageUserStatusPreview({ userId: "user_regular", status: "blocked" });
    expect(preview.userId).toBe("user_regular");
    expect(preview.currentStatus).toBe("active");
    expect(preview.newStatus).toBe("blocked");
    // No debe haber tocado al usuario.
    const user = await User.findOne({ clerkUserId: "user_regular" }).lean();
    expect((user as { status: string }).status).toBe("active");
  });

  it("capa E: notifica al usuario afectado el cambio de estado", async () => {
    await manageUserStatus({ userId: "user_regular", status: "blocked", reason: "abuso" }, ADMIN);
    const notif = await Notification.findOne({
      userId: "user_regular",
      type: "account_status_changed",
    }).lean();
    expect(notif).not.toBeNull();
    expect((notif as { title: string }).title).toContain("bloqueada");
  });

  it("falla si el usuario no existe", async () => {
    await expect(
      manageUserStatus({ userId: "user_x", status: "blocked", confirm: true }, ADMIN),
    ).rejects.toThrow(/no encontrado/i);
  });

  it("registra un evento de auditoría (entity: user, action: status_changed)", async () => {
    await manageUserStatus(
      { userId: "user_regular", status: "blocked", reason: "abuso", confirm: true },
      ADMIN,
    );
    const audit = await AuditEvent.findOne({ entityId: "user_regular", action: "status_changed" }).lean();
    expect(audit).not.toBeNull();
    expect((audit as { entity: string }).entity).toBe("user");
    expect((audit as { actorId: string }).actorId).toBe("user_admin");
    expect((audit as { metadata: { reason: string } }).metadata.reason).toBe("abuso");
  });

  it("rechaza un estado inválido (validación del schema)", async () => {
    await expect(
      manageUserStatus({ userId: "user_regular", status: "suspended", confirm: true }, ADMIN),
    ).rejects.toThrow();
  });

  it("rechaza cuando falta userId", async () => {
    await expect(manageUserStatus({ status: "blocked" }, ADMIN)).rejects.toThrow();
  });
});
