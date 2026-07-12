import { beforeEach, describe, expect, it } from "bun:test";

import mongoose from "@backend/db/mongoose";
import { AuditEvent, Payment, RentalRequest } from "@backend/db/schemas";
import { createPaymentSession } from "./create-payment-session";

// rr_payable: land_a (dueño user_seed), arrendatario user_regular.
const TENANT = { id: "user_regular", role: "user" as const };
const ADMIN = { id: "user_admin", role: "admin" as const };
const OWNER = { id: "user_seed", role: "user" as const }; // dueño, no arrendatario

function paymentInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    rentalRequestId: "rr_payable",
    currency: "USD",
    successUrl: "https://ok.test/return",
    cancelUrl: "https://cancel.test/return",
    ...overrides,
  };
}

// Siembra las solicitudes en beforeEach (no en el cuerpo del test): un write
// desde el cuerpo del test cuelga la siguiente lectura con bun:test + memory-server.
beforeEach(async () => {
  await RentalRequest.deleteMany({});
  await Payment.deleteMany({});
  await AuditEvent.deleteMany({});
  await mongoose.connection.db!.collection("rentalrequests").insertMany([
    { id: "rr_payable", landId: "land_a", tenantId: "user_regular", operation: "alquiler", status: "approved" },
    { id: "rr_notpayable", landId: "land_a", tenantId: "user_regular", operation: "alquiler", status: "pending_owner" },
    // Operación de venta sobre land_b, con oferta acordada.
    { id: "rr_venta", landId: "land_b", tenantId: "user_regular", operation: "venta", offerAmount: 55000, status: "approved" },
  ]);
});

describe("create_payment_session tool (HU-77 #194)", () => {
  it("el arrendatario obtiene un checkoutUrl para una solicitud pagable", async () => {
    const res = await createPaymentSession(paymentInput(), TENANT);

    expect(res.paymentId).toMatch(/^pay_/);
    expect(res.status).toBe("pending");
    expect(res.currency).toBe("USD");
    // Sin Stripe real (tests) → fallback dev: checkoutUrl === successUrl.
    expect(res.checkoutUrl).toBe("https://ok.test/return");
    expect(res.stripeSessionId).toMatch(/^cs_dev_/);
    // land_a: pricePerMonth 300 (alquiler → primer mes).
    expect(res.amount).toBe(300);
  });

  it("persiste el pago con el desglose (comisión y neto)", async () => {
    const res = await createPaymentSession(paymentInput(), TENANT);
    const payment = await Payment.findOne({ id: res.paymentId }).lean();
    expect(payment).not.toBeNull();
    expect((payment as { status: string }).status).toBe("pending");
    expect((payment as { amount: number }).amount).toBe(300);
    // 5% de 300 = 15; neto 285.
    expect((payment as { platformFeeAmount: number }).platformFeeAmount).toBe(15);
    expect((payment as { netAmount: number }).netAmount).toBe(285);
  });

  it("transiciona la solicitud a pending_payment", async () => {
    await createPaymentSession(paymentInput(), TENANT);
    const request = await RentalRequest.findOne({ id: "rr_payable" }).lean();
    expect((request as { status: string }).status).toBe("pending_payment");
  });

  it("un admin también puede iniciar el pago", async () => {
    const res = await createPaymentSession(paymentInput(), ADMIN);
    expect(res.status).toBe("pending");
    expect(res.checkoutUrl).toBe("https://ok.test/return");
  });

  it("bloquea a quien no es el arrendatario ni admin (p. ej. el dueño)", async () => {
    await expect(createPaymentSession(paymentInput(), OWNER)).rejects.toThrow(/arrendatario|admin/i);
  });

  it("rechaza una solicitud que no es pagable", async () => {
    await expect(
      createPaymentSession(paymentInput({ rentalRequestId: "rr_notpayable" }), TENANT),
    ).rejects.toThrow(/no es pagable/i);
  });

  it("falla si la solicitud no existe", async () => {
    await expect(
      createPaymentSession(paymentInput({ rentalRequestId: "rr_inexistente" }), TENANT),
    ).rejects.toThrow(/no encontrada/i);
  });

  it("registra un evento de auditoría (entity: payment, action: created)", async () => {
    const res = await createPaymentSession(paymentInput(), TENANT);
    const audit = await AuditEvent.findOne({ entityId: res.paymentId }).lean();
    expect(audit).not.toBeNull();
    expect((audit as { entity: string }).entity).toBe("payment");
    expect((audit as { action: string }).action).toBe("created");
    expect((audit as { actorId: string }).actorId).toBe("user_regular");
  });

  it("no expone secretos de Stripe en el resultado", async () => {
    const res = await createPaymentSession(paymentInput(), TENANT);
    const keys = Object.keys(res);
    expect(keys).toEqual(
      expect.arrayContaining(["paymentId", "stripeSessionId", "checkoutUrl", "status", "amount", "currency"]),
    );
    // Nada que parezca una clave/secreto.
    const serialized = JSON.stringify(res).toLowerCase();
    expect(serialized).not.toContain("sk_");
    expect(serialized).not.toContain("secret");
  });

  it("cobra la oferta en operaciones de venta", async () => {
    const res = await createPaymentSession(paymentInput({ rentalRequestId: "rr_venta" }), TENANT);
    expect(res.amount).toBe(55000);
  });

  it("rechaza una successUrl inválida (validación del schema)", async () => {
    await expect(
      createPaymentSession(paymentInput({ successUrl: "no-es-url" }), TENANT),
    ).rejects.toThrow();
  });

  it("rechaza cuando falta la moneda (validación del schema)", async () => {
    await expect(
      createPaymentSession({ rentalRequestId: "rr_payable", successUrl: "https://ok.test/x", cancelUrl: "https://c.test/x" }, TENANT),
    ).rejects.toThrow();
  });

  it("no crea ningún pago si la validación falla", async () => {
    const before = await Payment.countDocuments({});
    await expect(createPaymentSession(paymentInput({ currency: "EUR" }), TENANT)).rejects.toThrow();
    expect(await Payment.countDocuments({})).toBe(before);
  });
});
