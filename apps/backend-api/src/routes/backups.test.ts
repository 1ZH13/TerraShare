import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

const ADMIN = { "x-dev-user-id": "admin_backups", "x-dev-role": "admin" };

describe("Backups admin API (HU-56 #174)", () => {
  it("prohíbe el acceso a usuarios no admin", async () => {
    const list = await requestJson("/api/v1/admin/backups", {
      headers: { "x-dev-user-id": "plain_user" },
    });
    expect(list.response.status).toBe(403);

    const create = await requestJson("/api/v1/admin/backups", {
      method: "POST",
      headers: { "x-dev-user-id": "plain_user" },
    });
    expect(create.response.status).toBe(403);
  });

  it("crea, lista, verifica y consulta el detalle de un respaldo", async () => {
    const created = await requestJson("/api/v1/admin/backups", {
      method: "POST",
      headers: ADMIN,
    });
    expect(created.response.status).toBe(201);
    const backup = created.payload.data;
    expect(backup.id).toStartWith("backup_");
    expect(backup.algorithm).toBe("aes-256-gcm");
    expect(backup.status).toBe("completed");
    expect(backup.verifyStatus).toBe("pending");
    expect(Array.isArray(backup.collections)).toBe(true);

    const list = await requestJson("/api/v1/admin/backups", { headers: ADMIN });
    expect(list.response.status).toBe(200);
    expect(list.payload.data.total).toBeGreaterThanOrEqual(1);
    expect(list.payload.data.items.some((b: { id: string }) => b.id === backup.id)).toBe(true);

    const verify = await requestJson(`/api/v1/admin/backups/${backup.id}/verify`, {
      method: "POST",
      headers: ADMIN,
    });
    expect(verify.response.status).toBe(200);
    expect(verify.payload.data.verifyStatus).toBe("passed");
    expect(verify.payload.data.lastVerifiedAt).not.toBeNull();
    expect(verify.payload.data.verifyDetail.checksumOk).toBe(true);

    const detail = await requestJson(`/api/v1/admin/backups/${backup.id}`, { headers: ADMIN });
    expect(detail.response.status).toBe(200);
    expect(detail.payload.data.verifyStatus).toBe("passed");
  });

  it("devuelve 404 al verificar un respaldo inexistente", async () => {
    const verify = await requestJson("/api/v1/admin/backups/backup_nope/verify", {
      method: "POST",
      headers: ADMIN,
    });
    expect(verify.response.status).toBe(404);
  });
});
