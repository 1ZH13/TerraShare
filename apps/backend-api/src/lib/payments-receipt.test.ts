import { describe, expect, it } from "bun:test";

import { buildReceipt, receiptNumberFor } from "./payments-receipt";

describe("buildReceipt (HU-43 #161)", () => {
  it("genera un número de recibo determinista a partir del paymentId", () => {
    expect(receiptNumberFor("pay_abc123-def")).toBe("REC-ABC123DEF");
    expect(receiptNumberFor("pay_abc123-def")).toBe(receiptNumberFor("pay_abc123-def"));
  });

  it("construye el recibo con cliente, terreno y montos", () => {
    const receipt = buildReceipt({
      payment: {
        id: "pay_1",
        rentalRequestId: "rr_1",
        status: "paid",
        currency: "USD",
        amount: 1000,
        updatedAt: "2026-01-05T00:00:00.000Z",
      },
      land: { id: "land_1", title: "Finca El Roble" },
      customer: { id: "user_1", name: "Ana", email: "ana@example.com" },
    });

    expect(receipt.receiptNumber).toBe("REC-1");
    expect(receipt.amount).toBe(1000);
    expect(receipt.customer.name).toBe("Ana");
    expect(receipt.land?.title).toBe("Finca El Roble");
    expect(receipt.paidAt).toBe("2026-01-05T00:00:00.000Z");
    expect(receipt.refunds).toEqual([]);
  });

  it("normaliza la fecha de los reembolsos a ISO string", () => {
    const receipt = buildReceipt({
      payment: {
        id: "pay_2",
        rentalRequestId: "rr_2",
        status: "partially_refunded",
        currency: "USD",
        amount: 500,
        refundedAmount: 200,
        refunds: [{ id: "rf_1", amount: 200, reason: "parcial", createdAt: new Date("2026-02-01T00:00:00.000Z") }],
      },
    });

    expect(receipt.refundedAmount).toBe(200);
    expect(receipt.refunds).toHaveLength(1);
    expect(receipt.refunds[0].createdAt).toBe("2026-02-01T00:00:00.000Z");
  });
});
