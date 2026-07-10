import { describe, expect, it } from "bun:test";

import {
  computePaymentBreakdown,
  stripeChargeCurrency,
  toStripeMinorUnits,
} from "./payments-money";

describe("computePaymentBreakdown (HU-41 #159)", () => {
  it("aplica la comisión en bps sobre el bruto (5% de 1000)", () => {
    const b = computePaymentBreakdown(1000, "USD", 500);
    expect(b.grossAmount).toBe(1000);
    expect(b.platformFeeAmount).toBe(50);
    expect(b.netAmount).toBe(950);
    expect(b.currency).toBe("USD");
    expect(b.settlementCurrency).toBe("USD");
  });

  it("liquida PAB en USD conservando la moneda de presentación", () => {
    const b = computePaymentBreakdown(500, "PAB", 500);
    expect(b.currency).toBe("PAB");
    expect(b.settlementCurrency).toBe("USD");
    expect(b.netAmount).toBe(475);
  });

  it("redondea comisión y neto a 2 decimales", () => {
    const b = computePaymentBreakdown(333.33, "USD", 500);
    expect(b.platformFeeAmount).toBe(16.67);
    expect(b.netAmount).toBe(316.66);
  });

  it("comisión 0 bps deja el neto igual al bruto", () => {
    const b = computePaymentBreakdown(1200, "USD", 0);
    expect(b.platformFeeAmount).toBe(0);
    expect(b.netAmount).toBe(1200);
  });
});

describe("helpers de moneda de Stripe", () => {
  it("cobra siempre en usd", () => {
    expect(stripeChargeCurrency("USD")).toBe("usd");
    expect(stripeChargeCurrency("PAB")).toBe("usd");
  });

  it("convierte a céntimos enteros", () => {
    expect(toStripeMinorUnits(950.5)).toBe(95050);
    expect(toStripeMinorUnits(19.99)).toBe(1999);
  });
});
