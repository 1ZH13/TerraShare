import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

describe("payments routes", () => {
  it("creates checkout session in fallback mode", async () => {
    await requestJson("/api/v1/rental-requests/rr_seed_01/status", {
      method: "PATCH",
      headers: {
        "x-dev-user-id": "user_owner_01",
      },
      body: {
        status: "approved",
      },
    });

    const { response, payload } = await requestJson("/api/v1/payments/checkout-session", {
      method: "POST",
      headers: {
        "x-dev-user-id": "user_tenant_01",
      },
      body: {
        rentalRequestId: "rr_seed_01",
        currency: "USD",
        successUrl: "http://localhost:5174/payments/success",
        cancelUrl: "http://localhost:5174/payments/cancel",
      },
    });

    expect(response.status).toBe(201);
    expect(payload.ok).toBe(true);
    expect(payload.data.checkoutUrl).toBeTruthy();
  });

  it("updates payment status via webhook", async () => {
    // The request must be payable before a checkout session can be created.
    await requestJson("/api/v1/rental-requests/rr_seed_01/status", {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_owner_01" },
      body: { status: "approved" },
    });

    const createResponse = await requestJson("/api/v1/payments/checkout-session", {
      method: "POST",
      headers: {
        "x-dev-user-id": "user_tenant_01",
      },
      body: {
        rentalRequestId: "rr_seed_01",
        currency: "USD",
        successUrl: "http://localhost:5174/payments/success",
        cancelUrl: "http://localhost:5174/payments/cancel",
      },
    });

    const paymentId = createResponse.payload.data.paymentId as string;

    const { response, payload } = await requestJson("/api/v1/webhooks/stripe", {
      method: "POST",
      body: {
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: {
              paymentId,
            },
            payment_intent: "pi_test_01",
          },
        },
      },
    });

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.status).toBe("paid");
  });

  // HU-33 #152: en producción, un webhook con firma inválida (o sin verificación
  // configurada) se rechaza y el intento queda registrado en auditoría. El
  // código de estado depende del entorno: 400 si la firma es inválida (claves
  // reales presentes) o 500 si la verificación no está configurada (CI con
  // placeholders); en ambos casos es un rechazo y se registra.
  it("rejects webhooks in production and records the attempt", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const { response, payload } = await requestJson("/api/v1/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=deadbeef" },
        body: { type: "checkout.session.completed", data: { object: {} } },
      });

      expect([400, 500]).toContain(response.status);
      expect(payload.ok).toBe(false);
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
    }

    const audit = await requestJson("/api/v1/audit-events?entity=webhook&action=rejected", {
      headers: { "x-dev-user-id": "admin_wh", "x-dev-role": "admin" },
    });
    expect(audit.response.status).toBe(200);
    const found = (audit.payload.data as Array<{ entity: string; action: string; actorRole: string }>).some(
      (e) => e.entity === "webhook" && e.action === "rejected" && e.actorRole === "system",
    );
    expect(found).toBe(true);
  });

  it("auto-creates a draft contract once payment is confirmed", async () => {
    // A fresh request on a land without a seeded contract.
    const createReq = await requestJson("/api/v1/rental-requests", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_99" },
      body: {
        landId: "land_seed_02",
        period: {
          startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 300).toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 360).toISOString(),
        },
        intendedUse: "ganaderia",
      },
    });
    const requestId = createReq.payload.data.id as string;

    await requestJson(`/api/v1/rental-requests/${requestId}/status`, {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_owner_02" },
      body: { status: "approved" },
    });

    const checkout = await requestJson("/api/v1/payments/checkout-session", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_99" },
      body: {
        rentalRequestId: requestId,
        currency: "USD",
        successUrl: "http://localhost:5174/payments/success",
        cancelUrl: "http://localhost:5174/payments/cancel",
      },
    });
    const paymentId = checkout.payload.data.paymentId as string;

    await requestJson("/api/v1/webhooks/stripe", {
      method: "POST",
      body: {
        type: "checkout.session.completed",
        data: { object: { metadata: { paymentId }, payment_intent: "pi_test_contract" } },
      },
    });

    const contracts = await requestJson("/api/v1/contracts", {
      headers: { "x-dev-user-id": "user_tenant_99" },
    });
    const created = (contracts.payload.data as Array<{ rentalRequestId: string; status: string }>).find(
      (ct) => ct.rentalRequestId === requestId,
    );
    expect(created).toBeTruthy();
    expect(created?.status).toBe("draft");
  });
});
