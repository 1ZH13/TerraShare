import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

describe("GET /admin/migrations (#173)", () => {
  it("devuelve el estado de migraciones a un admin", async () => {
    const { response, payload } = await requestJson("/api/v1/admin/migrations", {
      headers: { "x-dev-user-id": "admin_migrations", "x-dev-role": "admin" },
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(payload.data.migrations)).toBe(true);
    // La migración de índices únicos siempre está registrada en el catálogo.
    expect(payload.data.migrations.some((m: { id: string }) => m.id === "001")).toBe(true);
    expect(typeof payload.data.applied).toBe("number");
    expect(typeof payload.data.pending).toBe("number");
  });

  it("prohíbe el acceso a un usuario no admin", async () => {
    const { response } = await requestJson("/api/v1/admin/migrations", {
      headers: { "x-dev-user-id": "user_plain_01" },
    });
    expect(response.status).toBe(403);
  });
});
