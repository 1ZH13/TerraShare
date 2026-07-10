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

  // ─── HU-43 #161: reembolsos y recibos ──────────────────────────────────────

  // Crea un pago en estado "paid" sobre rr_seed_01 y devuelve su id.
  async function createPaidPayment(): Promise<string> {
    await requestJson("/api/v1/rental-requests/rr_seed_01/status", {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_owner_01" },
      body: { status: "approved" },
    });
    const checkout = await requestJson("/api/v1/payments/checkout-session", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_01" },
      body: {
        rentalRequestId: "rr_seed_01",
        currency: "USD",
        successUrl: "http://localhost:5174/payments/success",
        cancelUrl: "http://localhost:5174/payments/cancel",
      },
    });
    const paymentId = checkout.payload.data.paymentId as string;
    await requestJson("/api/v1/webhooks/stripe", {
      method: "POST",
      body: { type: "checkout.session.completed", data: { object: { metadata: { paymentId } } } },
    });
    return paymentId;
  }

  it("refunds a paid payment (partial then full) and records an audit event", async () => {
    const paymentId = await createPaidPayment();

    const partial = await requestJson(`/api/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: { "x-dev-user-id": "web_dev_admin", "x-dev-role": "admin" },
      body: { amount: 1, reason: "ajuste" },
    });
    expect(partial.response.status).toBe(200);
    expect(partial.payload.data.status).toBe("partially_refunded");
    expect(partial.payload.data.refundedAmount).toBe(1);
    expect(partial.payload.data.refunds).toHaveLength(1);

    // Exceder el saldo reembolsable falla.
    const exceed = await requestJson(`/api/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: { "x-dev-user-id": "web_dev_admin", "x-dev-role": "admin" },
      body: { amount: 9_999_999 },
    });
    expect(exceed.response.status).toBe(422);

    // Reembolso total del resto (sin amount).
    const full = await requestJson(`/api/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: { "x-dev-user-id": "web_dev_admin", "x-dev-role": "admin" },
      body: {},
    });
    expect(full.response.status).toBe(200);
    expect(full.payload.data.status).toBe("refunded");

    // Un pago ya reembolsado por completo no admite más reembolsos.
    const again = await requestJson(`/api/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: { "x-dev-user-id": "web_dev_admin", "x-dev-role": "admin" },
      body: {},
    });
    expect(again.response.status).toBe(422);

    // Auditoría del reembolso.
    const audit = await requestJson("/api/v1/audit-events?entity=payment&action=refunded", {
      headers: { "x-dev-user-id": "web_dev_admin", "x-dev-role": "admin" },
    });
    const found = (audit.payload.data as Array<{ entityId: string; action: string }>).some(
      (e) => e.entityId === paymentId && e.action === "refunded",
    );
    expect(found).toBe(true);
  });

  it("rejects refunds for non-admins and for non-paid payments", async () => {
    const paymentId = await createPaidPayment();

    const forbidden = await requestJson(`/api/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_01" },
      body: {},
    });
    expect(forbidden.response.status).toBe(403);

    // Un pago pendiente (no pagado) no puede reembolsarse. Solicitud fresca.
    const createReq = await requestJson("/api/v1/rental-requests", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_np" },
      body: {
        landId: "land_seed_02",
        period: {
          startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 500).toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 560).toISOString(),
        },
        intendedUse: "ganaderia",
      },
    });
    const npRequestId = createReq.payload.data.id as string;
    await requestJson(`/api/v1/rental-requests/${npRequestId}/status`, {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_owner_02" },
      body: { status: "approved" },
    });
    const checkout = await requestJson("/api/v1/payments/checkout-session", {
      method: "POST",
      headers: { "x-dev-user-id": "user_tenant_np" },
      body: {
        rentalRequestId: npRequestId,
        currency: "USD",
        successUrl: "http://localhost:5174/payments/success",
        cancelUrl: "http://localhost:5174/payments/cancel",
      },
    });
    const pendingId = checkout.payload.data.paymentId as string;
    const notPaid = await requestJson(`/api/v1/payments/${pendingId}/refund`, {
      method: "POST",
      headers: { "x-dev-user-id": "web_dev_admin", "x-dev-role": "admin" },
      body: {},
    });
    expect(notPaid.response.status).toBe(422);
  });

  it("returns a downloadable receipt for the payment owner", async () => {
    const paymentId = await createPaidPayment();

    const receipt = await requestJson(`/api/v1/payments/${paymentId}/receipt`, {
      headers: { "x-dev-user-id": "user_tenant_01" },
    });
    expect(receipt.response.status).toBe(200);
    expect(receipt.payload.data.paymentId).toBe(paymentId);
    expect(receipt.payload.data.receiptNumber).toContain("REC-");
    expect(receipt.payload.data.issuer.name).toBe("TerraShare");

    // Un tercero sin relación con el pago no puede acceder.
    const forbidden = await requestJson(`/api/v1/payments/${paymentId}/receipt`, {
      headers: { "x-dev-user-id": "user_stranger_77" },
    });
    expect(forbidden.response.status).toBe(403);
  });
});
