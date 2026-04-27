import { Hono } from "hono";
import Stripe from "stripe";

import { env } from "../config/env";
import { failure, success } from "../lib/api-response";
import { requireAuth } from "../middleware/require-auth";
import { createAuditEvent } from "../store/audit";
import { Payment, RentalRequest, Land } from "../db/schemas";
import type { AppEnv } from "../types";

let stripeClient: Stripe | null = null;

type StripeEventObject = {
  id?: string;
  metadata?: Record<string, string>;
  payment_intent?: string | { id?: string } | null;
  client_reference_id?: string | null;
};

type StripeWebhookEvent = {
  type?: string;
  data?: { object?: StripeEventObject };
};

const paidWebhookEvents = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "payment_intent.succeeded",
]);

const failedWebhookEvents = new Set([
  "checkout.session.expired",
  "checkout.session.async_payment_failed",
  "payment_intent.payment_failed",
]);

function extractPaymentIntentId(paymentIntent: StripeEventObject["payment_intent"]) {
  if (typeof paymentIntent === "string") {
    return paymentIntent;
  }

  if (paymentIntent && typeof paymentIntent === "object" && typeof paymentIntent.id === "string") {
    return paymentIntent.id;
  }

  return undefined;
}

async function resolvePaymentIdFromWebhook(event: StripeWebhookEvent) {
  const object = event.data?.object;
  if (!object) {
    return undefined;
  }

  const metadataPaymentId = object.metadata?.paymentId;
  if (metadataPaymentId) {
    return metadataPaymentId;
  }

  if (typeof object.client_reference_id === "string" && object.client_reference_id.trim()) {
    return object.client_reference_id;
  }

  if (event.type?.startsWith("checkout.session") && object.id) {
    const paymentBySession = await Payment.findOne({ stripeSessionId: object.id }).lean();
    if (paymentBySession) {
      return paymentBySession.id;
    }
  }

  const paymentIntentId =
    extractPaymentIntentId(object.payment_intent) ??
    (event.type?.startsWith("payment_intent") ? object.id : undefined);

  if (paymentIntentId) {
    const paymentByIntent = await Payment.findOne({ stripePaymentIntentId: paymentIntentId }).lean();
    if (paymentByIntent) {
      return paymentByIntent.id;
    }
  }

  return undefined;
}

function getStripeClient() {
  if (!env.stripeSecretKey) {
    return null;
  }

  if (env.stripeSecretKey === "sk_test_placeholder") {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.stripeSecretKey, { apiVersion: "2026-03-25.dahlia" });
  }

  return stripeClient;
}

async function computePaymentAmount(rentalRequestId: string, fallback = 1000) {
  const request = await RentalRequest.findOne({ id: rentalRequestId }).lean();
  if (!request) return fallback;
  
  const land = await Land.findOne({ id: request.landId }).lean();
  return land?.priceRule?.pricePerMonth ?? fallback;
}

export const paymentRoutes = new Hono<AppEnv>();

paymentRoutes.post("/payments/checkout-session", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const body = (await c.req.json().catch(() => null)) as
    | {
        rentalRequestId?: string;
        currency?: "USD" | "PAB";
        successUrl?: string;
        cancelUrl?: string;
      }
    | null;

  if (!body?.rentalRequestId || !body.currency || !body.successUrl || !body.cancelUrl) {
    return failure(c, 400, "VALIDATION_ERROR", "Missing checkout session fields");
  }

  const request = await RentalRequest.findOne({ id: body.rentalRequestId }).lean();
  if (!request) {
    return failure(c, 404, "NOT_FOUND", "Rental request not found");
  }

  if (request.tenantId !== authUser.id && authUser.role !== "admin") {
    return failure(c, 403, "FORBIDDEN", "Only tenant or admin can start payment");
  }

  if (!["approved", "pending_payment"].includes(request.status)) {
    return failure(c, 422, "BUSINESS_RULE_VIOLATION", "Rental request is not payable");
  }

  const amount = await computePaymentAmount(request.id);

  const payment = await Payment.create({
    id: `pay_${crypto.randomUUID()}`,
    rentalRequestId: request.id,
    amount,
    currency: body.currency,
    status: "pending",
  });

  const stripe = getStripeClient();

  if (stripe) {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: payment.id,
      success_url: body.successUrl,
      cancel_url: body.cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: body.currency.toLowerCase(),
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: `TerraShare rental ${request.id}`,
            },
          },
        },
      ],
      metadata: {
        paymentId: payment.id,
        rentalRequestId: request.id,
      },
      payment_intent_data: {
        metadata: {
          paymentId: payment.id,
          rentalRequestId: request.id,
        },
      },
    });

    const paymentIntentId = extractPaymentIntentId(session.payment_intent);

    await Payment.updateOne(
      { id: payment.id },
      {
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        checkoutUrl: session.url ?? undefined,
      },
    );
  } else {
    await Payment.updateOne(
      { id: payment.id },
      { stripeSessionId: `cs_dev_${crypto.randomUUID()}`, checkoutUrl: body.successUrl },
    );
  }

  await RentalRequest.updateOne(
    { id: request.id },
    { status: "pending_payment", updatedAt: new Date() },
  );

  createAuditEvent({
    actor: authUser,
    entity: "payment",
    action: "created",
    entityId: payment.id,
    metadata: {
      rentalRequestId: request.id,
      amount,
      currency: body.currency,
    },
  });

  const updatedPayment = await Payment.findOne({ id: payment.id }).lean();

  return success(
    c,
    {
      paymentId: updatedPayment?.id,
      stripeSessionId: updatedPayment?.stripeSessionId,
      checkoutUrl: updatedPayment?.checkoutUrl,
      status: updatedPayment?.status,
    },
    201,
  );
});

paymentRoutes.get("/payments", requireAuth, async (c) => {
  const authUser = c.get("authUser");

  const rentalRequestId = c.req.query("rentalRequestId");
  const contractId = c.req.query("contractId");
  const status = c.req.query("status");

  const query: Record<string, any> = {};

  if (authUser.role !== "admin") {
    const requests = await RentalRequest.find({ tenantId: authUser.id }).select("id").lean();
    const requestIds = requests.map((r) => r.id);
    query.rentalRequestId = { $in: requestIds };
  }

  if (rentalRequestId) query.rentalRequestId = rentalRequestId;
  if (contractId) query.contractId = contractId;
  if (status) query.status = status;

  const items = await Payment.find(query).sort({ createdAt: -1 }).lean();
  return success(c, items);
});

paymentRoutes.get("/payments/:paymentId", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const paymentId = c.req.param("paymentId");

  const payment = await Payment.findOne({ id: paymentId }).lean();
  if (!payment) {
    return failure(c, 404, "NOT_FOUND", "Payment not found");
  }

  const request = await RentalRequest.findOne({ id: payment.rentalRequestId }).lean();
  if (
    authUser.role !== "admin" &&
    request &&
    request.tenantId !== authUser.id
  ) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this payment");
  }

  return success(c, payment);
});

paymentRoutes.post("/webhooks/stripe", async (c) => {
  const signature = c.req.header("stripe-signature");
  const webhookSecret = env.stripeWebhookSecret;
  const stripe = getStripeClient();

  const rawBody = await c.req.text();
  const isDev = process.env.NODE_ENV !== "production";
  let event: StripeWebhookEvent;

  if (signature && webhookSecret && stripe) {
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret) as unknown as StripeWebhookEvent;
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
      return failure(c, 401, "UNAUTHORIZED", "Invalid webhook signature");
    }
  } else {
    if (!isDev) {
      if (!signature) {
        return failure(c, 401, "UNAUTHORIZED", "Missing stripe-signature header");
      }

      return failure(c, 500, "INTERNAL_ERROR", "Stripe webhook verification is not configured correctly");
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return failure(c, 400, "VALIDATION_ERROR", "Invalid webhook payload");
    }

    if (!payload || typeof payload !== "object") {
      return failure(c, 400, "VALIDATION_ERROR", "Invalid webhook payload");
    }

    event = payload as StripeWebhookEvent;
  }

  const paymentId = await resolvePaymentIdFromWebhook(event);

  if (!paymentId) {
    return failure(c, 400, "VALIDATION_ERROR", "Unable to resolve payment from webhook event");
  }

  const payment = await Payment.findOne({ id: paymentId }).lean();
  if (!payment) {
    return failure(c, 404, "NOT_FOUND", "Payment not found");
  }

  const eventType = event.type ?? "";

  if (!paidWebhookEvents.has(eventType) && !failedWebhookEvents.has(eventType)) {
    return success(c, {
      received: true,
      paymentId: payment.id,
      status: payment.status,
      ignored: true,
    });
  }

  let newStatus = payment.status;
  if (paidWebhookEvents.has(eventType)) {
    newStatus = "paid";
  } else if (failedWebhookEvents.has(eventType)) {
    newStatus = "failed";
  }

  const paymentIntentId =
    extractPaymentIntentId(event.data?.object?.payment_intent) ??
    (eventType.startsWith("payment_intent") ? event.data?.object?.id : undefined);

  const stripeSessionId = eventType.startsWith("checkout.session") ? event.data?.object?.id : undefined;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (newStatus !== payment.status) {
    updateData.status = newStatus;
  }
  if (paymentIntentId) {
    updateData.stripePaymentIntentId = paymentIntentId;
  }
  if (stripeSessionId) {
    updateData.stripeSessionId = stripeSessionId;
  }

  await Payment.updateOne(
    { id: payment.id },
    updateData,
  );

  if (newStatus === "paid" && payment.status !== "paid") {
    await RentalRequest.updateOne(
      { id: payment.rentalRequestId },
      { status: "paid", updatedAt: new Date() },
    );
  }

  return success(c, {
    received: true,
    paymentId: payment.id,
    status: newStatus,
  });
});
