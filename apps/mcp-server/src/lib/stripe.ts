import Stripe from "stripe";

/**
 * Helper Stripe autocontenido para el mcp-server (#194/#197).
 *
 * Lee la configuración directamente de `process.env` — NO importa
 * `@backend/config/env`, que valida Clerk al cargarse y rompería el arranque del
 * servidor MCP (que corre sin Clerk). Espeja la semántica del backend:
 * `getStripeClient()` devuelve `null` si no hay clave real (o es el placeholder),
 * y en ese caso las tools usan el fallback de desarrollo.
 */

let stripeClient: Stripe | null = null;

/** Cliente Stripe si hay una clave real configurada; `null` en dev/sin clave. */
export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === "sk_test_placeholder") return null;

  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: "2026-06-24.dahlia" });
  }
  return stripeClient;
}

/** Comisión de plataforma en basis points (default 5% = 500 bps), como el backend. */
export function platformFeeBps(): number {
  const raw = Number(process.env.STRIPE_PLATFORM_FEE_BPS);
  if (!Number.isFinite(raw) || raw < 0 || raw > 10000) return 500;
  return Math.trunc(raw);
}

/** Extrae el id del PaymentIntent de la sesión (string u objeto). */
export function extractPaymentIntentId(
  paymentIntent: string | { id?: string } | null | undefined,
): string | undefined {
  if (typeof paymentIntent === "string") return paymentIntent;
  if (paymentIntent && typeof paymentIntent === "object" && typeof paymentIntent.id === "string") {
    return paymentIntent.id;
  }
  return undefined;
}
