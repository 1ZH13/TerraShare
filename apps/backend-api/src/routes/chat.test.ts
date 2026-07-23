import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

describe("chat routes", () => {
  it("lists chats for participant", async () => {
    const { response, payload } = await requestJson("/api/v1/chats", {
      headers: {
        "x-dev-user-id": "user_tenant_01",
      },
    });

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.data)).toBe(true);
  });

  it("rejects opening a chat as tenant on own land (#393)", async () => {
    // `land_seed_01` es de `user_owner_01`. Antes esto creaba un chat del dueño
    // consigo mismo desde el botón «Preguntar al dueño» de su propia ficha.
    const { response, payload } = await requestJson("/api/v1/chats", {
      method: "POST",
      headers: { "x-dev-user-id": "user_owner_01" },
      body: {
        landId: "land_seed_01",
        participants: [{ userId: "user_owner_01", role: "tenant" }],
      },
    });

    expect(response.status).toBe(422);
    expect(payload.error.code).toBe("BUSINESS_RULE_VIOLATION");
  });

  it("lets a non-owner open a chat about a land (#393)", async () => {
    const { response } = await requestJson("/api/v1/chats", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_01" },
      body: {
        landId: "land_seed_01",
        participants: [{ userId: "user_tenant_01", role: "tenant" }],
      },
    });

    expect(response.status).toBe(201);
  });

  it("still lets the owner open a chat as owner on own land (#393)", async () => {
    // La regla mira el rol a propósito: bloquear al dueño en cualquier chat
    // sobre su terreno le impediría escribir a los interesados.
    const { response } = await requestJson("/api/v1/chats", {
      method: "POST",
      headers: { "x-dev-user-id": "user_owner_01" },
      body: {
        landId: "land_seed_01",
        participants: [
          { userId: "user_owner_01", role: "owner" },
          { userId: "user_tenant_01", role: "tenant" },
        ],
      },
    });

    expect(response.status).toBe(201);
  });

  it("creates message for chat participant", async () => {
    const { response, payload } = await requestJson("/api/v1/chats/chat_seed_01/messages", {
      method: "POST",
      headers: {
        "x-dev-user-id": "user_tenant_01",
      },
      body: {
        text: "Mensaje de prueba",
      },
    });

    expect(response.status).toBe(201);
    expect(payload.ok).toBe(true);
    expect(payload.data.text).toBe("Mensaje de prueba");
  });
});
