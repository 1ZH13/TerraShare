import { Hono } from "hono";
import Stripe from "stripe";

import { env } from "../config/env";
import { failure, success } from "../lib/api-response";
import { requireAuth } from "../middleware/require-auth";
import { createAuditEvent } from "../store/audit";
import { Payment, RentalRequest, Land } from "../db/schemas";
import type { AppEnv } from "../types";

let stripeClient: Stripe | null = null;

function getStripeClient() {
  if (!env.stripeSecretKey) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.stripeSecretKey, { apiVersion: "2025-02-24.acacia" });
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
    });

    await Payment.updateOne(
      { id: payment.id },
      { stripeSessionId: session.id, checkoutUrl: session.url ?? undefined },
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

  const rawBody = await c.req.text();

  if (webhookSecret && signature) {
    const stripe = getStripeClient();
    if (stripe) {
      try {
        stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err) {
        console.error("Stripe webhook signature verification failed:", err);
        return failure(c, 401, "UNAUTHORIZED", "Invalid webhook signature");
      }
    }
  } else if (!signature) {
    return failure(c, 401, "UNAUTHORIZED", "Missing stripe-signature header");
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

  const event = payload as {
    type?: string;
    data?: { object?: { metadata?: Record<string, string>; id?: string; payment_intent?: string } };
  };

  const metadata = event.data?.object?.metadata ?? {};
  const paymentId = metadata.paymentId;

  if (!paymentId) {
    return failure(c, 400, "VALIDATION_ERROR", "Missing paymentId in webhook metadata");
  }

  const payment = await Payment.findOne({ id: paymentId }).lean();
  if (!payment) {
    return failure(c, 404, "NOT_FOUND", "Payment not found");
  }

  let newStatus = payment.status;
  if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
    newStatus = "paid";
  } else if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") {
    newStatus = "failed";
  }

  await Payment.updateOne(
    { id: payment.id },
    {
      status: newStatus,
      stripePaymentIntentId: event.data?.object?.payment_intent || payment.stripePaymentIntentId,
      updatedAt: new Date(),
    },
  );

  if (newStatus === "paid") {
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
