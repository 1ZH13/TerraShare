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
