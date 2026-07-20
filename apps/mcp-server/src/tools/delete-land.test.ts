import { describe, expect, it, beforeEach } from "bun:test";

import { Land, Notification, User } from "@backend/db/schemas";
import { deleteLand, deleteLandPreview } from "./delete-land";

const ownerUser = { id: "user_seed", role: "user" };
const adminUser = { id: "user_admin", role: "admin" };
const regularUser = { id: "user_regular", role: "user" };

describe("delete_land tool (HU-69 #186)", () => {
  beforeEach(async () => {
    await User.findOneAndUpdate(
      { clerkUserId: "user_seed" },
      { clerkUserId: "user_seed", email: "seed@test.com", role: "user", status: "active", profile: { fullName: "Seed Owner" } },
      { upsert: true },
    );
  });

  it("soft-delete: retira el terreno (inactive + deletedAt) sin borrarlo físicamente", async () => {
    const res = await deleteLand({ landId: "land_a" }, ownerUser);
    expect(res.deleted).toBe(true);
    expect(res.recoverable).toBe(true);
    // El documento sigue existiendo (recuperable), pero inactivo y marcado.
    const land = await Land.findOne({ id: "land_a" }).lean();
    expect(land).not.toBeNull();
    expect((land as { status: string }).status).toBe("inactive");
    expect((land as { deletedAt: Date | null }).deletedAt).not.toBeNull();
  });

  it("admin puede eliminar terrenos de otros", async () => {
    const res = await deleteLand({ landId: "land_b" }, adminUser);
    expect(res.deleted).toBe(true);
  });

  it("capa B: deleteLandPreview resume el terreno sin borrarlo", async () => {
    const preview = await deleteLandPreview({ landId: "land_a" });
    expect(preview.landId).toBe("land_a");
    expect(preview.status).toBe("active");
    const land = await Land.findOne({ id: "land_a" }).lean();
    expect((land as { status: string }).status).toBe("active");
  });

  it("capa E: notifica al dueño tras el retiro", async () => {
    await deleteLand({ landId: "land_a" }, ownerUser);
    const notif = await Notification.findOne({ userId: "user_seed", type: "land_deleted" }).lean();
    expect(notif).not.toBeNull();
  });

  it("usuario regular NO puede eliminar terreno de otro", async () => {
    try {
      await deleteLand({ landId: "land_a", confirm: true }, regularUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("No autorizado");
    }
  });

  it("terreno inexistente lanza error", async () => {
    try {
      await deleteLand({ landId: "land_nonexistent", confirm: true }, ownerUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("no encontrado");
    }
  });
});
