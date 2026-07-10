export type BusinessCurrency = "USD" | "PAB";

/**
 * Cálculo de dinero de un pago (HU-41 #159): comisión de plataforma y neto.
 *
 * La comisión se calcula en basis points (100 bps = 1%) sobre el monto bruto.
 * `settlementCurrency` es la moneda con la que se cobra efectivamente en Stripe:
 * PAB está anclado 1:1 al USD y Panamá liquida en USD, por lo que ambos casos
 * liquidan en "USD". Este helper es puro (sin `env`) para poder testearlo.
 */

export interface PaymentBreakdown {
  /** Monto bruto que paga el arrendatario, en la moneda de presentación. */
  grossAmount: number;
  /** Comisión de plataforma retenida sobre el bruto. */
  platformFeeAmount: number;
  /** Neto a liquidar al propietario (bruto − comisión). */
  netAmount: number;
  /** Moneda de presentación (la que ve el usuario). */
  currency: BusinessCurrency;
  /** Moneda con la que se cobra en Stripe. */
  settlementCurrency: "USD";
}

/** Redondeo a 2 decimales evitando errores de coma flotante. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computePaymentBreakdown(
  amount: number,
  currency: BusinessCurrency,
  feeBps: number,
): PaymentBreakdown {
  const grossAmount = round2(amount);
  const platformFeeAmount = round2((grossAmount * feeBps) / 10000);
  const netAmount = round2(grossAmount - platformFeeAmount);

  return {
    grossAmount,
    platformFeeAmount,
    netAmount,
    currency,
    settlementCurrency: "USD",
  };
}

/**
 * Moneda (en minúsculas) que se envía a Stripe. PAB se cobra como USD porque
 * está anclado 1:1 y Stripe liquida en USD en Panamá.
 */
export function stripeChargeCurrency(_currency: BusinessCurrency): string {
  return "usd";
}

/** Convierte un monto a los céntimos enteros que espera la API de Stripe. */
export function toStripeMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}
