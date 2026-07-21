import { beforeEach, describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";
import { Notification } from "../db/schemas";

describe("notifications routes", () => {
  it("responds 200 with an empty list when the user has no notifications", async () => {
    const { response, payload } = await requestJson("/api/v1/notifications", {
      headers: { "x-dev-user-id": "user_owner_01" },
    });

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.data).toHaveLength(0);
  });

  it("requires authentication", async () => {
    const { response } = await requestJson("/api/v1/notifications");

    expect(response.status).toBe(401);
  });
});

/**
 * Las notificaciones reales se persisten en Mongo (alertas de búsquedas
 * guardadas y acciones sensibles del MCP). Antes estas rutas leían del store en
 * memoria y esas notificaciones nunca llegaban al usuario.
 *
 * Se siembran en `beforeEach` (escritura) y los tests solo leen por HTTP.
 */
describe("notifications persistidas en Mongo (#350)", () => {
  const owner = "notif_user_01";
  const other = "notif_user_02";

  beforeEach(async () => {
    await Notification.create({
      id: "ntf_test_01",
      userId: owner,
      type: "saved_search_match",
      title: "Nuevo terreno coincide con tu busqueda",
      body: "Un terreno nuevo encaja con tus filtros.",
      read: false,
    });
  });

  it("lista las notificaciones creadas en Mongo", async () => {
    const { response, payload } = await requestJson("/api/v1/notifications", {
      headers: { "x-dev-user-id": owner },
    });

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].id).toBe("ntf_test_01");
    expect(payload.data[0].type).toBe("saved_search_match");
    // No debe filtrar los campos internos de Mongo.
    expect(payload.data[0]._id).toBeUndefined();
  });

  it("no muestra las notificaciones de otro usuario", async () => {
    const { payload } = await requestJson("/api/v1/notifications", {
      headers: { "x-dev-user-id": other },
    });
    expect(payload.data).toHaveLength(0);
  });

  it("devuelve el detalle de una notificación propia", async () => {
    const { response, payload } = await requestJson("/api/v1/notifications/ntf_test_01", {
      headers: { "x-dev-user-id": owner },
    });
    expect(response.status).toBe(200);
    expect(payload.data.title).toContain("Nuevo terreno");
  });

  it("bloquea el detalle de una notificación ajena", async () => {
    const { response } = await requestJson("/api/v1/notifications/ntf_test_01", {
      headers: { "x-dev-user-id": other },
    });
    expect(response.status).toBe(403);
  });

  it("marca una notificación como leída", async () => {
    const { response, payload } = await requestJson("/api/v1/notifications/ntf_test_01/read", {
      method: "PATCH",
      headers: { "x-dev-user-id": owner },
    });

    expect(response.status).toBe(200);
    expect(payload.data.read).toBe(true);
    expect(payload.data.readAt).toBeTruthy();
  });

  it("no deja marcar como leída una notificación ajena", async () => {
    const { response } = await requestJson("/api/v1/notifications/ntf_test_01/read", {
      method: "PATCH",
      headers: { "x-dev-user-id": other },
    });
    expect(response.status).toBe(403);
  });

  it("devuelve 404 si la notificación no existe", async () => {
    const { response } = await requestJson("/api/v1/notifications/ntf_inexistente", {
      headers: { "x-dev-user-id": owner },
    });
    expect(response.status).toBe(404);
  });
});
