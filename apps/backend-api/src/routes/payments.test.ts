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

  // HU-42 #160: misma Idempotency-Key → mismo pago, sin duplicados.
  it("returns the same payment for repeated checkout with the same Idempotency-Key", async () => {
    await requestJson("/api/v1/rental-requests/rr_seed_01/status", {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_owner_01" },
      body: { status: "approved" },
    });

    const key = `idem_${crypto.randomUUID()}`;
    const body = {
      rentalRequestId: "rr_seed_01",
      currency: "USD",
      successUrl: "http://localhost:5174/payments/success",
      cancelUrl: "http://localhost:5174/payments/cancel",
    };

    const first = await requestJson("/api/v1/payments/checkout-session", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_01", "Idempotency-Key": key },
      body,
    });
    const second = await requestJson("/api/v1/payments/checkout-session", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_01", "Idempotency-Key": key },
      body,
    });

    expect(first.response.status).toBe(201);
    expect(first.payload.data.paymentId).toBeTruthy();
    expect(second.payload.data.paymentId).toBe(first.payload.data.paymentId);
    expect(second.payload.data.idempotent).toBe(true);
  });

  // HU-42 #160: un webhook reentregado (mismo event.id) no repite efectos.
  it("does not re-apply effects for a duplicate webhook event", async () => {
    const createReq = await requestJson("/api/v1/rental-requests", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_dup" },
      body: {
        landId: "land_seed_02",
        period: {
          startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 400).toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 460).toISOString(),
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
      headers: { "x-dev-user-id": "user_tenant_dup" },
      body: {
        rentalRequestId: requestId,
        currency: "USD",
        successUrl: "http://localhost:5174/payments/success",
        cancelUrl: "http://localhost:5174/payments/cancel",
      },
    });
    const paymentId = checkout.payload.data.paymentId as string;

    const eventId = `evt_${crypto.randomUUID()}`;
    const webhookBody = {
      id: eventId,
      type: "checkout.session.completed",
      data: { object: { metadata: { paymentId }, payment_intent: "pi_dup" } },
    };

    const firstDelivery = await requestJson("/api/v1/webhooks/stripe", { method: "POST", body: webhookBody });
    const secondDelivery = await requestJson("/api/v1/webhooks/stripe", { method: "POST", body: webhookBody });

    expect(firstDelivery.payload.data.status).toBe("paid");
    expect(secondDelivery.payload.data.duplicate).toBe(true);

    // El efecto (contrato en borrador) ocurre una sola vez.
    const contracts = await requestJson("/api/v1/contracts", {
      headers: { "x-dev-user-id": "user_tenant_dup" },
    });
    const matching = (contracts.payload.data as Array<{ rentalRequestId: string }>).filter(
      (ct) => ct.rentalRequestId === requestId,
    );
    expect(matching).toHaveLength(1);
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
