import { beforeEach, describe, expect, it } from "bun:test";

import mongoose from "@backend/db/mongoose";
import { AuditEvent, Notification, Payment, RentalRequest } from "@backend/db/schemas";
import { refundPayment, refundPreview } from "./refund-payment";

const ADMIN = { id: "user_admin", role: "admin" as const };

function refundInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { paymentId: "pay_paid", ...overrides };
}

// Pagos sembrados con el driver nativo en beforeEach (no en el cuerpo del test).
beforeEach(async () => {
  await Payment.deleteMany({});
  await AuditEvent.deleteMany({});
  await Notification.deleteMany({});
  await RentalRequest.deleteMany({});
  // Solicitud del pago pay_paid (rr_1): arrendatario user_tenant → destinatario de la notificación (E).
  await mongoose.connection.db!.collection("rentalrequests").insertMany([
    { id: "rr_1", landId: "land_a", tenantId: "user_tenant", operation: "alquiler", status: "paid" },
  ]);
  await mongoose.connection.db!.collection("payments").insertMany([
    // Pagado, sin reembolsos (reembolsable 300).
    { id: "pay_paid", rentalRequestId: "rr_1", amount: 300, currency: "USD", status: "paid", refundedAmount: 0, refunds: [] },
    // Parcialmente reembolsado (reembolsable 100).
    { id: "pay_partial", rentalRequestId: "rr_2", amount: 300, currency: "USD", status: "partially_refunded", refundedAmount: 200, refunds: [] },
    // Pendiente (no reembolsable por estado).
    { id: "pay_pending", rentalRequestId: "rr_3", amount: 300, currency: "USD", status: "pending", refundedAmount: 0, refunds: [] },
    // Reembolsable 0 (ya al máximo pese al estado).
    { id: "pay_maxed", rentalRequestId: "rr_4", amount: 300, currency: "USD", status: "partially_refunded", refundedAmount: 300, refunds: [] },
  ]);
});

describe("refund_payment tool (HU-80 #197)", () => {
  it("reembolsa el total cuando no se indica importe", async () => {
    const res = await refundPayment(refundInput(), ADMIN);

    expect(res.paymentId).toBe("pay_paid");
    expect(res.status).toBe("refunded");
    expect(res.refundedAmount).toBe(300);
    expect(res.refund.id).toMatch(/^rf_/);
    expect(res.refund.amount).toBe(300);
  });

  it("reembolsa parcialmente y deja el pago en partially_refunded", async () => {
    const res = await refundPayment(refundInput({ amount: 100, reason: "Ajuste" }), ADMIN);

    expect(res.status).toBe("partially_refunded");
    expect(res.refundedAmount).toBe(100);
    expect(res.refund.amount).toBe(100);
    expect(res.refund.reason).toBe("Ajuste");
  });

  it("completa un reembolso parcial previo hasta el total", async () => {
    const res = await refundPayment(refundInput({ paymentId: "pay_partial", amount: 100 }), ADMIN);
    expect(res.status).toBe("refunded");
    expect(res.refundedAmount).toBe(300);
  });

  it("persiste el reembolso en Payment.refunds y refundedAmount", async () => {
    const res = await refundPayment(refundInput({ amount: 120 }), ADMIN);
    const payment = await Payment.findOne({ id: "pay_paid" }).lean();
    expect((payment as { refundedAmount: number }).refundedAmount).toBe(120);
    const refunds = (payment as { refunds: { id: string; amount: number }[] }).refunds;
    expect(refunds.length).toBe(1);
    expect(refunds[0].id).toBe(res.refund.id);
    expect(refunds[0].amount).toBe(120);
  });

  it("capa D: bloquea reembolsos por encima del límite configurado (MCP_REFUND_MAX)", async () => {
    process.env.MCP_REFUND_MAX = "100";
    try {
      await expect(refundPayment(refundInput({ amount: 300 }), ADMIN)).rejects.toThrow(/límite/i);
      // Por debajo del límite sí procede.
      const res = await refundPayment(refundInput({ amount: 50 }), ADMIN);
      expect(res.refund.amount).toBe(50);
    } finally {
      delete process.env.MCP_REFUND_MAX;
    }
  });

  it("capa E: notifica al arrendatario tras el reembolso", async () => {
    await refundPayment(refundInput({ amount: 120 }), ADMIN);
    const notif = await Notification.findOne({ userId: "user_tenant", type: "payment_refunded" }).lean();
    expect(notif).not.toBeNull();
    expect((notif as { title: string }).title).toContain("Reembolso");
  });

  it("capa B: refundPreview resume el reembolso sin ejecutarlo", async () => {
    const preview = await refundPreview({ paymentId: "pay_paid", amount: 120 });
    expect(preview.paymentId).toBe("pay_paid");
    expect(preview.refundable).toBe(300);
    expect(preview.requested).toBe(120);
    // No debe haber tocado el pago.
    const payment = await Payment.findOne({ id: "pay_paid" }).lean();
    expect((payment as { refundedAmount: number }).refundedAmount).toBe(0);
    expect((payment as { status: string }).status).toBe("paid");
  });

  it("falla si el pago no existe", async () => {
    await expect(refundPayment(refundInput({ paymentId: "pay_x" }), ADMIN)).rejects.toThrow(/no encontrado/i);
  });

  it("rechaza reembolsar un pago no pagado", async () => {
    await expect(refundPayment(refundInput({ paymentId: "pay_pending" }), ADMIN)).rejects.toThrow(/pagados/i);
  });

  it("rechaza un importe que excede el saldo reembolsable", async () => {
    await expect(refundPayment(refundInput({ amount: 500 }), ADMIN)).rejects.toThrow(/excede/i);
  });

  it("rechaza si el pago ya está totalmente reembolsado", async () => {
    await expect(refundPayment(refundInput({ paymentId: "pay_maxed" }), ADMIN)).rejects.toThrow(/totalmente reembolsado/i);
  });

  it("registra un evento de auditoría (entity: payment, action: refunded)", async () => {
    await refundPayment(refundInput({ amount: 50, reason: "test" }), ADMIN);
    const audit = await AuditEvent.findOne({ entityId: "pay_paid", action: "refunded" }).lean();
    expect(audit).not.toBeNull();
    expect((audit as { entity: string }).entity).toBe("payment");
    expect((audit as { actorId: string }).actorId).toBe("user_admin");
    expect((audit as { metadata: { amount: number } }).metadata.amount).toBe(50);
  });

  it("rechaza un importe negativo (validación del schema)", async () => {
    await expect(refundPayment(refundInput({ amount: -10 }), ADMIN)).rejects.toThrow();
  });

  it("no modifica el pago si la validación falla", async () => {
    await expect(refundPayment(refundInput({ amount: -10 }), ADMIN)).rejects.toThrow();
    const payment = await Payment.findOne({ id: "pay_paid" }).lean();
    expect((payment as { refundedAmount: number }).refundedAmount).toBe(0);
    expect((payment as { status: string }).status).toBe("paid");
  });
});
