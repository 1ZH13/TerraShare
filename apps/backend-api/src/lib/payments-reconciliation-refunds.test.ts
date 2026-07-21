import { describe, expect, it } from "bun:test";

import { reconcile } from "./payments-reconciliation";

/**
 * Los reembolsos en la conciliación (#358).
 *
 * Antes solo contaba `status === "paid"`, así que un pago con reembolso parcial
 * —dinero que sí entró— desaparecía de los totales y, además, hacía que su
 * solicitud pagada se denunciara como «pagada sin ningún pago confirmado».
 */

const base = {
  currency: "USD" as const,
  platformFeeAmount: 50,
  netAmount: 950,
  amount: 1000,
};

describe("conciliación con reembolsos", () => {
  it("cuenta un reembolso parcial como cobro y descuenta lo devuelto del neto", () => {
    const report = reconcile(
      [{ id: "pay_1", rentalRequestId: "rr_1", status: "partially_refunded", ...base, refundedAmount: 200 }],
      [{ id: "rr_1", status: "paid" }],
      [{ rentalRequestId: "rr_1" }],
    );

    const usd = report.totals.find((t) => t.currency === "USD")!;
    expect(usd.paidCount).toBe(1);
    expect(usd.grossAmount).toBe(1000);
    expect(usd.platformFeeAmount).toBe(50);
    expect(usd.refundedAmount).toBe(200);
    expect(usd.netAmount).toBe(750);
  });

  it("no denuncia como «solicitud pagada sin pago» una con reembolso parcial", () => {
    const report = reconcile(
      [{ id: "pay_1", rentalRequestId: "rr_1", status: "partially_refunded", ...base, refundedAmount: 200 }],
      [{ id: "rr_1", status: "paid" }],
      [{ rentalRequestId: "rr_1" }],
    );

    expect(report.discrepancies.filter((d) => d.type === "request_paid_without_paid_payment")).toEqual([]);
  });

  it("sí denuncia una solicitud que sigue «pagada» tras un reembolso total", () => {
    const report = reconcile(
      [{ id: "pay_1", rentalRequestId: "rr_1", status: "refunded", ...base, refundedAmount: 1000 }],
      [{ id: "rr_1", status: "paid" }],
      [{ rentalRequestId: "rr_1" }],
    );

    const flagged = report.discrepancies.filter((d) => d.type === "request_paid_without_paid_payment");
    expect(flagged).toHaveLength(1);
    expect(flagged[0].rentalRequestId).toBe("rr_1");
  });

  it("un reembolso total deja el neto en cero pero conserva el movimiento en el bruto", () => {
    const report = reconcile(
      [{ id: "pay_1", rentalRequestId: "rr_1", status: "refunded", ...base, refundedAmount: 1000 }],
      [{ id: "rr_1", status: "paid" }],
      [{ rentalRequestId: "rr_1" }],
    );

    const usd = report.totals.find((t) => t.currency === "USD")!;
    expect(usd.grossAmount).toBe(1000);
    expect(usd.refundedAmount).toBe(1000);
    // 950 de neto menos los 1000 devueltos: el cobro quedó revertido con creces
    // (la comisión de plataforma no se reembolsa).
    expect(usd.netAmount).toBe(-50);
  });

  it("declara un contador para cada estado de pago, incluidos los de reembolso", () => {
    const report = reconcile([], [], []);
    expect(report.paymentsByStatus).toHaveProperty("refunded", 0);
    expect(report.paymentsByStatus).toHaveProperty("partially_refunded", 0);
  });

  it("un pago sin reembolsos deja el total devuelto en cero", () => {
    const report = reconcile(
      [{ id: "pay_1", rentalRequestId: "rr_1", status: "paid", ...base }],
      [{ id: "rr_1", status: "paid" }],
      [{ rentalRequestId: "rr_1" }],
    );

    const usd = report.totals.find((t) => t.currency === "USD")!;
    expect(usd.refundedAmount).toBe(0);
    expect(usd.netAmount).toBe(950);
  });
});
