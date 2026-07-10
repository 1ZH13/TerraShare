import { describe, expect, it } from "bun:test";

import { reconcile } from "./payments-reconciliation";

describe("reconcile (HU-41 #159)", () => {
  it("cuadra un pago pagado con solicitud pagada y contrato, sin discrepancias", () => {
    const report = reconcile(
      [
        {
          id: "pay_ok",
          rentalRequestId: "rr_ok",
          status: "paid",
          amount: 1000,
          currency: "USD",
          platformFeeAmount: 50,
          netAmount: 950,
        },
      ],
      [{ id: "rr_ok", status: "paid" }],
      [{ rentalRequestId: "rr_ok" }],
    );

    expect(report.discrepancyCount).toBe(0);
    expect(report.totals).toHaveLength(1);
    expect(report.totals[0]).toMatchObject({
      currency: "USD",
      paidCount: 1,
      grossAmount: 1000,
      platformFeeAmount: 50,
      netAmount: 950,
    });
    expect(report.paymentsByStatus.paid).toBe(1);
  });

  it("detecta pago pagado con solicitud no pagada", () => {
    const report = reconcile(
      [{ id: "p1", rentalRequestId: "rr1", status: "paid", amount: 100, currency: "USD" }],
      [{ id: "rr1", status: "approved" }],
      [{ rentalRequestId: "rr1" }],
    );
    expect(report.discrepancies.some((d) => d.type === "payment_paid_request_not_paid")).toBe(true);
  });

  it("detecta pago pagado sin contrato", () => {
    const report = reconcile(
      [{ id: "p2", rentalRequestId: "rr2", status: "paid", amount: 100, currency: "USD" }],
      [{ id: "rr2", status: "paid" }],
      [],
    );
    expect(report.discrepancies.some((d) => d.type === "payment_paid_without_contract")).toBe(true);
  });

  it("detecta pago huérfano (sin solicitud)", () => {
    const report = reconcile(
      [{ id: "p3", rentalRequestId: "missing", status: "paid", amount: 100, currency: "USD" }],
      [],
      [],
    );
    expect(report.discrepancies.some((d) => d.type === "orphan_payment")).toBe(true);
  });

  it("detecta solicitud pagada sin pago confirmado", () => {
    const report = reconcile(
      [],
      [{ id: "rr4", status: "paid" }],
      [{ rentalRequestId: "rr4" }],
    );
    expect(report.discrepancies.some((d) => d.type === "request_paid_without_paid_payment")).toBe(true);
  });

  it("agrupa totales por moneda y solo cuenta pagos pagados", () => {
    const report = reconcile(
      [
        { id: "a", rentalRequestId: "r1", status: "paid", amount: 100, currency: "USD", platformFeeAmount: 5, netAmount: 95 },
        { id: "b", rentalRequestId: "r2", status: "paid", amount: 200, currency: "USD", platformFeeAmount: 10, netAmount: 190 },
        { id: "c", rentalRequestId: "r3", status: "paid", amount: 300, currency: "PAB", platformFeeAmount: 15, netAmount: 285 },
        { id: "d", rentalRequestId: "r4", status: "pending", amount: 999, currency: "USD" },
      ],
      [
        { id: "r1", status: "paid" },
        { id: "r2", status: "paid" },
        { id: "r3", status: "paid" },
        { id: "r4", status: "approved" },
      ],
      [{ rentalRequestId: "r1" }, { rentalRequestId: "r2" }, { rentalRequestId: "r3" }],
    );

    const usd = report.totals.find((t) => t.currency === "USD");
    const pab = report.totals.find((t) => t.currency === "PAB");
    expect(usd).toMatchObject({ paidCount: 2, grossAmount: 300, platformFeeAmount: 15, netAmount: 285 });
    expect(pab).toMatchObject({ paidCount: 1, grossAmount: 300, netAmount: 285 });
    expect(report.paymentsByStatus.pending).toBe(1);
    expect(report.discrepancyCount).toBe(0);
  });
});
