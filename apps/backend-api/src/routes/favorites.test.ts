import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

/** Crea un terreno publicado (activo) y devuelve su id. */
async function createActiveLand(ownerId: string, title: string): Promise<string> {
  const create = await requestJson("/api/v1/lands", {
    method: "POST",
    headers: { "x-dev-user-id": ownerId },
    body: {
      title,
      area: 30,
      allowedUses: ["agricultura"],
      location: { province: "Panama", district: "Panama" },
      priceRule: { currency: "USD", pricePerMonth: 300 },
    },
  });
  const landId = create.payload.data.id as string;
  await requestJson(`/api/v1/lands/${landId}/status`, {
    method: "PATCH",
    headers: { "x-dev-user-id": ownerId },
    body: { status: "active" },
  });
  return landId;
}

describe("favorites routes (#147)", () => {
  it("guarda, lista y quita un terreno de favoritos", async () => {
    const landId = await createActiveLand("user_fav_owner", "Terreno guardable");
    const buyer = "user_fav_buyer_01";

    const add = await requestJson(`/api/v1/users/me/favorites/${landId}`, {
      method: "POST",
      headers: { "x-dev-user-id": buyer },
    });
    expect(add.response.status).toBe(200);
    expect(add.payload.data.favorited).toBe(true);

    const list = await requestJson("/api/v1/users/me/favorites", {
      headers: { "x-dev-user-id": buyer },
    });
    expect(list.response.status).toBe(200);
    expect(Array.isArray(list.payload.data)).toBe(true);
    expect(list.payload.data.some((l: { id: string }) => l.id === landId)).toBe(true);
    // No debe filtrar campos internos de Mongo.
    expect(list.payload.data[0]._id).toBeUndefined();

    const remove = await requestJson(`/api/v1/users/me/favorites/${landId}`, {
      method: "DELETE",
      headers: { "x-dev-user-id": buyer },
    });
    expect(remove.response.status).toBe(200);
    expect(remove.payload.data.favorited).toBe(false);

    const listAfter = await requestJson("/api/v1/users/me/favorites", {
      headers: { "x-dev-user-id": buyer },
    });
    expect(listAfter.payload.data.some((l: { id: string }) => l.id === landId)).toBe(false);
  });

  it("guardar dos veces es idempotente (no duplica)", async () => {
    const landId = await createActiveLand("user_fav_owner", "Terreno idempotente");
    const buyer = "user_fav_buyer_02";

    await requestJson(`/api/v1/users/me/favorites/${landId}`, {
      method: "POST",
      headers: { "x-dev-user-id": buyer },
    });
    const second = await requestJson(`/api/v1/users/me/favorites/${landId}`, {
      method: "POST",
      headers: { "x-dev-user-id": buyer },
    });
    expect(second.response.status).toBe(200);

    const list = await requestJson("/api/v1/users/me/favorites", {
      headers: { "x-dev-user-id": buyer },
    });
    const matches = list.payload.data.filter((l: { id: string }) => l.id === landId);
    expect(matches).toHaveLength(1);
  });

  it("guardar un terreno inexistente devuelve 404", async () => {
    const res = await requestJson("/api/v1/users/me/favorites/land_no_existe", {
      method: "POST",
      headers: { "x-dev-user-id": "user_fav_buyer_03" },
    });
    expect(res.response.status).toBe(404);
    expect(res.payload.error.code).toBe("NOT_FOUND");
  });

  it("los favoritos son privados por usuario", async () => {
    const landId = await createActiveLand("user_fav_owner", "Terreno privado");
    await requestJson(`/api/v1/users/me/favorites/${landId}`, {
      method: "POST",
      headers: { "x-dev-user-id": "user_fav_alice" },
    });

    const bob = await requestJson("/api/v1/users/me/favorites", {
      headers: { "x-dev-user-id": "user_fav_bob" },
    });
    expect(bob.payload.data.some((l: { id: string }) => l.id === landId)).toBe(false);
  });

  it("exige autenticación", async () => {
    const res = await requestJson("/api/v1/users/me/favorites");
    expect(res.response.status).toBe(401);
  });
});
