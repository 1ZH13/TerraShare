import type Stripe from "stripe";

/**
 * Verificación de firma de webhooks de Stripe (HU-33 #152).
 *
 * Aislada del endpoint para poder probarla sin depender del singleton del
 * cliente Stripe ni del `env` resuelto en tiempo de import. La verificación es
 * puramente criptográfica (HMAC del raw body): no llama a la API de Stripe.
 */

export type WebhookRejectionReason = "missing_signature" | "invalid_signature";

export class WebhookVerificationError extends Error {
  readonly reason: WebhookRejectionReason;

  constructor(reason: WebhookRejectionReason, message: string) {
    super(message);
    this.name = "WebhookVerificationError";
    this.reason = reason;
  }
}

/**
 * Verifica la cabecera `Stripe-Signature` contra el `STRIPE_WEBHOOK_SECRET`.
 * Devuelve el evento ya verificado o lanza `WebhookVerificationError` cuando la
 * firma falta o es inválida.
 */
export async function verifyStripeWebhook(input: {
  stripe: Stripe;
  rawBody: string;
  signature: string | undefined | null;
  secret: string;
}): Promise<Stripe.Event> {
  const { stripe, rawBody, signature, secret } = input;

  if (!signature) {
    throw new WebhookVerificationError("missing_signature", "Missing stripe-signature header");
  }

  try {
    return await stripe.webhooks.constructEventAsync(rawBody, signature, secret);
  } catch (err) {
    throw new WebhookVerificationError(
      "invalid_signature",
      err instanceof Error ? err.message : "Invalid webhook signature",
    );
  }
}
