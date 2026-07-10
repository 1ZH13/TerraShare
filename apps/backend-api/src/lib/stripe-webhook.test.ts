import { describe, expect, it } from "bun:test";
import Stripe from "stripe";

import { verifyStripeWebhook, WebhookVerificationError } from "./stripe-webhook";

const secret = "whsec_test_secret_123";
// Cliente solo para firmar/verificar (HMAC local): nunca golpea la API.
const stripe = new Stripe("sk_test_dummy", { apiVersion: "2026-03-25.dahlia" });

function sign(payload: string): Promise<string> {
  return stripe.webhooks.generateTestHeaderStringAsync({ payload, secret });
}

describe("verifyStripeWebhook (HU-33 #152)", () => {
  it("acepta un payload con firma válida y devuelve el evento", async () => {
    const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
    const event = await verifyStripeWebhook({
      stripe,
      rawBody: payload,
      signature: await sign(payload),
      secret,
    });

    expect(event.id).toBe("evt_1");
    expect(event.type).toBe("checkout.session.completed");
  });

  it("rechaza una firma inválida con reason invalid_signature", async () => {
    const payload = JSON.stringify({ id: "evt_2" });

    const promise = verifyStripeWebhook({
      stripe,
      rawBody: payload,
      signature: "t=1,v1=deadbeef",
      secret,
    });

    await expect(promise).rejects.toBeInstanceOf(WebhookVerificationError);
    await expect(promise).rejects.toMatchObject({ reason: "invalid_signature" });
  });

  it("rechaza cuando falta la cabecera de firma con reason missing_signature", async () => {
    const payload = JSON.stringify({ id: "evt_3" });

    const promise = verifyStripeWebhook({
      stripe,
      rawBody: payload,
      signature: undefined,
      secret,
    });

    await expect(promise).rejects.toBeInstanceOf(WebhookVerificationError);
    await expect(promise).rejects.toMatchObject({ reason: "missing_signature" });
  });

  it("rechaza cuando el cuerpo fue manipulado tras firmar", async () => {
    const original = JSON.stringify({ id: "evt_4", amount: 100 });
    const signature = await sign(original);
    const tampered = JSON.stringify({ id: "evt_4", amount: 999999 });

    await expect(
      verifyStripeWebhook({ stripe, rawBody: tampered, signature, secret }),
    ).rejects.toMatchObject({ reason: "invalid_signature" });
  });
});
