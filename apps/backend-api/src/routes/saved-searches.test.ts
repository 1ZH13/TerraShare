import { describe, it, expect, beforeEach } from "bun:test";
import mongoose from "mongoose";
import { requestJson, resetStore } from "../lib/http-test-utils";
import { Notification } from "../db/schemas";

beforeEach(async () => {
  resetStore();
  await mongoose.connection.collections.savedsearches?.drop().catch(() => {});
  await Notification.deleteMany({ type: "saved_search_match" }).catch(() => {});
});

describe("saved-searches routes", () => {
  const userId = "ss_user_01";

  it("creates a saved search", async () => {
    const res = await requestJson("/api/v1/users/me/saved-searches", {
      method: "POST",
      headers: { "x-dev-user-id": userId },
      body: { name: "Terrenos en Panama", filters: { province: "Panamá", priceMax: 5000 } },
    });
    expect(res.response.status).toBe(201);
    expect(res.payload.data.name).toBe("Terrenos en Panama");
    expect(res.payload.data.filters.province).toBe("Panamá");
  });

  it("lists saved searches", async () => {
    await requestJson("/api/v1/users/me/saved-searches", {
      method: "POST",
      headers: { "x-dev-user-id": userId },
      body: { name: "Search 1", filters: { province: "Panamá" } },
    });
    const res = await requestJson("/api/v1/users/me/saved-searches", {
      headers: { "x-dev-user-id": userId },
    });
    expect(res.response.status).toBe(200);
    expect(res.payload.data.length).toBe(1);
  });

  it("deletes a saved search", async () => {
    const created = await requestJson("/api/v1/users/me/saved-searches", {
      method: "POST",
      headers: { "x-dev-user-id": userId },
      body: { name: "To delete", filters: {} },
    });
    const id = created.payload.data.id;
    const res = await requestJson(`/api/v1/users/me/saved-searches/${id}`, {
      method: "DELETE",
      headers: { "x-dev-user-id": userId },
    });
    expect(res.response.status).toBe(200);
  });

  it("rejects nameless search", async () => {
    const res = await requestJson("/api/v1/users/me/saved-searches", {
      method: "POST",
      headers: { "x-dev-user-id": userId },
      body: { name: "", filters: {} },
    });
    expect(res.response.status).toBe(400);
  });

  it("does not return other user searches", async () => {
    await requestJson("/api/v1/users/me/saved-searches", {
      method: "POST",
      headers: { "x-dev-user-id": "ss_user_02" },
      body: { name: "Other", filters: {} },
    });
    const res = await requestJson("/api/v1/users/me/saved-searches", {
      headers: { "x-dev-user-id": userId },
    });
    expect(res.payload.data.length).toBe(0);
  });

  it("returns 404 deleting non-existent search", async () => {
    const res = await requestJson("/api/v1/users/me/saved-searches/nonexistent", {
      method: "DELETE",
      headers: { "x-dev-user-id": userId },
    });
    expect(res.response.status).toBe(404);
  });
});

describe("saved-search alerts (#325)", () => {
  const seeker = "ss_seeker_01";
  const owner = "ss_owner_01";

  /** Crea un terreno en `draft` que casa con la búsqueda guardada. */
  async function createDraftLand(): Promise<string> {
    const res = await requestJson("/api/v1/lands", {
      method: "POST",
      headers: { "x-dev-user-id": owner },
      body: {
        title: "Finca alertas",
        area: 20,
        allowedUses: ["agricultura"],
        location: { province: "Chiriqui", district: "David" },
        priceRule: { currency: "USD", pricePerMonth: 400 },
      },
    });
    return res.payload.data.id as string;
  }

  /**
   * Cuenta las alertas tal y como las ve el usuario: a través del centro de
   * notificaciones (`GET /notifications`), que desde #350 lee de Mongo. Así se
   * verifica el camino completo: la alerta se genera y llega al usuario.
   */
  async function notifCount(userId: string = seeker): Promise<number> {
    const res = await requestJson("/api/v1/notifications", {
      headers: { "x-dev-user-id": userId },
    });
    const items = (res.payload?.data ?? []) as { type: string }[];
    return items.filter((n) => n.type === "saved_search_match").length;
  }

  it("no alerta mientras el terreno sigue en borrador, y alerta al publicarlo", async () => {
    await requestJson("/api/v1/users/me/saved-searches", {
      method: "POST",
      headers: { "x-dev-user-id": seeker },
      body: { name: "Chiriqui barato", filters: { province: "Chiriqui", priceMax: 1000 } },
    });

    const landId = await createDraftLand();
    // Crear en draft NO debe alertar: el terreno aún no es visible.
    expect(await notifCount()).toBe(0);

    await requestJson(`/api/v1/lands/${landId}/status`, {
      method: "PATCH",
      headers: { "x-dev-user-id": owner },
      body: { status: "active" },
    });

    // Al publicarse sí alerta (el aviso es asíncrono: damos margen).
    await new Promise((r) => setTimeout(r, 300));
    expect(await notifCount()).toBe(1);
  });

  it("no alerta al dueño sobre su propia publicación", async () => {
    await requestJson("/api/v1/users/me/saved-searches", {
      method: "POST",
      headers: { "x-dev-user-id": owner },
      body: { name: "Mis propios", filters: { province: "Chiriqui" } },
    });

    const landId = await createDraftLand();
    await requestJson(`/api/v1/lands/${landId}/status`, {
      method: "PATCH",
      headers: { "x-dev-user-id": owner },
      body: { status: "active" },
    });

    await new Promise((r) => setTimeout(r, 300));
    expect(await notifCount(owner)).toBe(0);
  });
});
