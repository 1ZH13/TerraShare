import { beforeEach, describe, expect, it } from "bun:test";

import { AuditEvent, Land, Notification } from "@backend/db/schemas";
import { moderateLand } from "./moderate-land";

const ADMIN = { id: "user_admin", role: "admin" as const };

// El preload siembra land_a (active) y lo reinicia en cada test. Solo limpiamos
// AuditEvent (que el preload no toca).
beforeEach(async () => {
  await AuditEvent.deleteMany({});
});

describe("moderate_land tool (HU-90 #207)", () => {
  it("despublica un terreno (active -> inactive)", async () => {
    const res = await moderateLand({ landId: "land_a", status: "inactive", reason: "Spam" }, ADMIN);

    expect(res.landId).toBe("land_a");
    expect(res.previousStatus).toBe("active");
    expect(res.status).toBe("inactive");
  });

  it("persiste el nuevo estado en Mongo", async () => {
    await moderateLand({ landId: "land_a", status: "inactive" }, ADMIN);
    const land = await Land.findOne({ id: "land_a" }).lean();
    expect((land as { status: string }).status).toBe("inactive");
  });

  it("reactiva un terreno inactivo (inactive -> active)", async () => {
    const res = await moderateLand({ landId: "land_inactive", status: "active" }, ADMIN);
    expect(res.previousStatus).toBe("inactive");
    expect(res.status).toBe("active");
  });

  it("registra auditoría 'rejected' al despublicar", async () => {
    await moderateLand({ landId: "land_a", status: "inactive", reason: "Spam" }, ADMIN);
    const audit = await AuditEvent.findOne({ entityId: "land_a", action: "rejected" }).lean();
    expect(audit).not.toBeNull();
    expect((audit as { entity: string }).entity).toBe("land");
    expect((audit as { actorId: string }).actorId).toBe("user_admin");
    expect((audit as { metadata: { reason: string } }).metadata.reason).toBe("Spam");
  });

  it("registra auditoría 'approved' al reactivar", async () => {
    await moderateLand({ landId: "land_inactive", status: "active" }, ADMIN);
    const audit = await AuditEvent.findOne({ entityId: "land_inactive", action: "approved" }).lean();
    expect(audit).not.toBeNull();
  });

  it("capa E: notifica al dueño del terreno moderado", async () => {
    // land_a lo posee user_seed (ver preload).
    await moderateLand({ landId: "land_a", status: "inactive", reason: "Spam" }, ADMIN);
    const notif = await Notification.findOne({ userId: "user_seed", type: "land_moderated" }).lean();
    expect(notif).not.toBeNull();
    expect((notif as { title: string }).title).toContain("despublicado");
  });

  it("falla si el terreno no existe", async () => {
    await expect(
      moderateLand({ landId: "land_x", status: "inactive" }, ADMIN),
    ).rejects.toThrow(/no encontrado/i);
  });

  it("rechaza un estado inválido (validación del schema)", async () => {
    await expect(
      moderateLand({ landId: "land_a", status: "draft" }, ADMIN),
    ).rejects.toThrow();
  });

  it("rechaza cuando falta landId", async () => {
    await expect(moderateLand({ status: "inactive" }, ADMIN)).rejects.toThrow();
  });
});
