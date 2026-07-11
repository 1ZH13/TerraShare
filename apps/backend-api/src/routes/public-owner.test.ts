import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

/**
 * Perfil público del propietario (#150). Público (sin auth), solo datos no
 * sensibles, con nº de terrenos activos como señal de confianza.
 */
describe("GET /users/:userId/public (#150)", () => {
  it("devuelve el perfil público sin requerir autenticación", async () => {
    // Creamos un terreno para tener un propietario con al menos una publicación.
    const created = await requestJson("/api/v1/lands", {
      method: "POST",
      headers: { "x-dev-user-id": "user_owner_public_01" },
      body: {
        title: "Terreno del perfil público",
        area: 20,
        allowedUses: ["agricultura"],
        location: { province: "Panama", district: "Panama" },
        priceRule: { currency: "USD", pricePerMonth: 250 },
      },
    });
    const landId = created.payload.data.id;
    await requestJson(`/api/v1/lands/${landId}/status`, {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_owner_public_01" },
      body: { status: "active" },
    });

    // Sin cabeceras de auth: el endpoint es público.
    const { response, payload } = await requestJson(
      "/api/v1/users/user_owner_public_01/public",
    );

    expect(response.status).toBe(200);
    expect(payload.data.id).toBe("user_owner_public_01");
    expect(typeof payload.data.displayName).toBe("string");
    expect(typeof payload.data.verified).toBe("boolean");
    expect(payload.data.activeLandsCount).toBeGreaterThanOrEqual(1);
    // No debe exponer datos sensibles.
    expect(payload.data.email).toBeUndefined();
    expect(payload.data.phone).toBeUndefined();
  });

  it("un propietario desconocido devuelve un perfil por defecto (no 404)", async () => {
    const { response, payload } = await requestJson("/api/v1/users/user_inexistente_xyz/public");
    expect(response.status).toBe(200);
    expect(payload.data.displayName).toBe("Propietario");
    expect(payload.data.verified).toBe(false);
    expect(payload.data.activeLandsCount).toBe(0);
  });
});
