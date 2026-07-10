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

  // HU-41 #159: conciliación de pagos, solo admin.
  it("returns a reconciliation report for admins", async () => {
    const { response, payload } = await requestJson("/api/v1/payments/reconciliation", {
      headers: { "x-dev-user-id": "web_dev_admin", "x-dev-role": "admin" },
    });

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.data.totals)).toBe(true);
    expect(Array.isArray(payload.data.discrepancies)).toBe(true);
    expect(typeof payload.data.discrepancyCount).toBe("number");
    expect(payload.data.paymentsByStatus).toBeDefined();
    expect(typeof payload.data.generatedAt).toBe("string");
  });

  it("rejects reconciliation for non-admins", async () => {
    const { response } = await requestJson("/api/v1/payments/reconciliation", {
      headers: { "x-dev-user-id": "user_tenant_01" },
    });
    expect(response.status).toBe(403);
  });

  it("reflects a fresh paid payment in the reconciliation totals", async () => {
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
      body: {
        type: "checkout.session.completed",
        data: { object: { metadata: { paymentId }, payment_intent: "pi_reconcile" } },
      },
    });

    const report = await requestJson("/api/v1/payments/reconciliation", {
      headers: { "x-dev-user-id": "web_dev_admin", "x-dev-role": "admin" },
    });
    const usd = (report.payload.data.totals as Array<{ currency: string; paidCount: number }>).find(
      (t) => t.currency === "USD",
    );
    expect(usd).toBeTruthy();
    expect(usd!.paidCount).toBeGreaterThan(0);
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
