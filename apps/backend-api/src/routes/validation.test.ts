import { describe, expect, it } from "bun:test";

import { createApp } from "../app";
import { requestJson } from "../lib/http-test-utils";

const DEV = { "x-dev-user-id": "user_validation_01" };

/**
 * Validación de payloads con schemas Zod compartidos (#139). Cada endpoint
 * responde 400 VALIDATION_ERROR con `details` por campo ante un payload inválido.
 */
describe("validación de payloads (#139)", () => {
  it("POST /lands: faltan campos requeridos → 400 con detalle", async () => {
    const { response, payload } = await requestJson("/api/v1/lands", {
      method: "POST",
      headers: DEV,
      body: { title: "ab" }, // título corto y sin area/location/priceRule/allowedUses
    });
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(payload.error.details)).toBe(true);
    expect(payload.error.details.length).toBeGreaterThan(0);
  });

  it("POST /lands: uso de terreno inválido → 400", async () => {
    const { response, payload } = await requestJson("/api/v1/lands", {
      method: "POST",
      headers: DEV,
      body: {
        title: "Terreno válido",
        area: 10,
        allowedUses: ["mineria"], // no está en el enum
        location: { province: "Panama", district: "Panama" },
        priceRule: { currency: "USD", pricePerMonth: 100 },
      },
    });
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("PATCH /lands/:id/status: estado inválido → 400", async () => {
    // Creamos un terreno primero para tener un id real.
    const created = await requestJson("/api/v1/lands", {
      method: "POST",
      headers: DEV,
      body: {
        title: "Terreno estado",
        area: 10,
        allowedUses: ["agricultura"],
        location: { province: "Panama", district: "Panama" },
        priceRule: { currency: "USD", pricePerMonth: 100 },
      },
    });
    const landId = created.payload.data.id;
    const { response, payload } = await requestJson(`/api/v1/lands/${landId}/status`, {
      method: "PATCH",
      headers: DEV,
      body: { status: "publicado" }, // no es draft/active/inactive
    });
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /contracts: resumen demasiado corto → 400", async () => {
    const { response, payload } = await requestJson("/api/v1/contracts", {
      method: "POST",
      headers: DEV,
      body: {
        rentalRequestId: "rr_x",
        terms: { summary: "corto", startsAt: "2026-01-01", endsAt: "2026-02-01" },
      },
    });
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /leads: email inválido → 400", async () => {
    const { response, payload } = await requestJson("/api/v1/leads", {
      method: "POST",
      body: { email: "no-es-un-email" },
    });
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /leads: body NO-JSON → 400 (no 500) — regresión E-2", async () => {
    const app = createApp();
    const response = await app.request("/api/v1/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "esto no es json {",
    });
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("PATCH /auth/profile: body vacío → 400", async () => {
    const { response, payload } = await requestJson("/api/v1/auth/profile", {
      method: "PATCH",
      headers: DEV,
      body: {},
    });
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /chats: sin participantes → 400", async () => {
    const { response, payload } = await requestJson("/api/v1/chats", {
      method: "POST",
      headers: DEV,
      body: { participants: [] },
    });
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /payments/create-intent: falta currency → 400", async () => {
    const { response, payload } = await requestJson("/api/v1/payments/create-intent", {
      method: "POST",
      headers: DEV,
      body: { rentalRequestId: "rr_x" },
    });
    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });
});
