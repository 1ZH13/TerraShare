import { describe, expect, it, beforeEach } from "bun:test";

import { createApp } from "../app";
import { AppSetting } from "../db/schemas";
import { invalidateSecuritySettingsCache, REQUIRE_ADMIN_MFA_KEY } from "../lib/security-settings";

/**
 * Panel de seguridad: exigencia de 2FA a los administradores (#362).
 *
 * Lo que estas pruebas fijan es sobre todo la **salida de emergencia**: la
 * pantalla que apaga la exigencia no puede quedar detrás de la propia
 * exigencia, o encenderla sin 2FA configurada encierra a la cuenta fuera de su
 * panel sin forma de volver atrás.
 *
 * Gotcha de bun:test + mongodb-memory-server: escribir en el cuerpo del test y
 * leer después puede colgarse, así que lo que se escribe se siembra en
 * `beforeEach` y el cuerpo solo lee (salvo las pruebas del PATCH, que son una
 * sola escritura y su respuesta).
 */

const app = createApp();

const adminHeaders = { "x-dev-user-id": "admin_sec_test", "x-dev-role": "admin" };
const userHeaders = { "x-dev-user-id": "user_sec_test", "x-dev-role": "user" };

const get = (path: string, headers: Record<string, string>) =>
  app.request(path, { headers });

const patch = (path: string, headers: Record<string, string>, body: unknown) =>
  app.request(path, {
    method: "PATCH",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("GET /admin/security-settings", () => {
  it("devuelve el ajuste en vigor y si quien pregunta tiene 2FA", async () => {
    const res = await get("/api/v1/admin/security-settings", adminHeaders);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(typeof body.data.requireAdminMfa).toBe("boolean");
    expect(["stored", "environment"]).toContain(body.data.source);
    expect(typeof body.data.environmentDefault).toBe("boolean");
    expect(typeof body.data.callerMfaEnabled).toBe("boolean");
  });

  it("fuera de producción la 2FA no se exige por defecto", async () => {
    const res = await get("/api/v1/admin/security-settings", adminHeaders);
    const body = await res.json();

    expect(body.data.requireAdminMfa).toBe(false);
    // Sin nada guardado, el valor sale del entorno.
    expect(body.data.source).toBe("environment");
  });

  it("un usuario sin rol admin no puede verlo", async () => {
    const res = await get("/api/v1/admin/security-settings", userHeaders);
    expect(res.status).toBe(403);
  });

  it("sin autenticar responde 401", async () => {
    const res = await app.request("/api/v1/admin/security-settings");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /admin/security-settings", () => {
  it("guarda la exigencia y la respuesta pasa a declararse como guardada", async () => {
    const res = await patch("/api/v1/admin/security-settings", adminHeaders, { requireAdminMfa: true });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.requireAdminMfa).toBe(true);
    expect(body.data.source).toBe("stored");
  });

  it("rechaza un valor que no sea booleano", async () => {
    const res = await patch("/api/v1/admin/security-settings", adminHeaders, { requireAdminMfa: "sí" });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rechaza un cuerpo sin el campo", async () => {
    const res = await patch("/api/v1/admin/security-settings", adminHeaders, {});
    expect(res.status).toBe(400);
  });

  it("un usuario sin rol admin no puede cambiarlo", async () => {
    const res = await patch("/api/v1/admin/security-settings", userHeaders, { requireAdminMfa: true });
    expect(res.status).toBe(403);
  });
});

describe("la exigencia activa no encierra al admin fuera del panel", () => {
  beforeEach(async () => {
    // 2FA exigida y guardada, que es el escenario que dejaba fuera a la cuenta.
    await AppSetting.updateOne(
      { key: REQUIRE_ADMIN_MFA_KEY },
      { $set: { key: REQUIRE_ADMIN_MFA_KEY, value: true } },
      { upsert: true },
    );
    invalidateSecuritySettingsCache();
  });

  it("el ajuste guardado queda en vigor y se declara como tal", async () => {
    const res = await get("/api/v1/admin/security-settings", adminHeaders);
    const body = await res.json();

    expect(body.data.requireAdminMfa).toBe(true);
    expect(body.data.source).toBe("stored");
  });

  it("con la exigencia activa, la pantalla de seguridad sigue accesible", async () => {
    // Es la salida de emergencia: si esto respondiera 403, no habría manera de
    // apagar la exigencia desde la interfaz.
    const res = await get("/api/v1/admin/security-settings", adminHeaders);
    expect(res.status).toBe(200);
  });

  it("con la exigencia activa, se puede volver a apagar", async () => {
    const res = await patch("/api/v1/admin/security-settings", adminHeaders, { requireAdminMfa: false });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.requireAdminMfa).toBe(false);
  });
});
