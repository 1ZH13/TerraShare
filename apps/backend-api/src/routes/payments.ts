import { Hono } from "hono";
import Stripe from "stripe";

import { env } from "../config/env";
import { failure, success } from "../lib/api-response";
import { requireAuth } from "../middleware/require-auth";
import { createAuditEvent } from "../store/audit";
import { getStore } from "../store/in-memory-db";
import type { PaymentRecord, RentalRequestRecord } from "../store/types";
import type { AppEnv } from "../types";

let stripeClient: Stripe | null = null;

function getStripeClient() {
  if (!env.stripeSecretKey) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.stripeSecretKey, { apiVersion: "2026-03-25.dahlia" });
  }

  return stripeClient;
}

function computePaymentAmount(request: RentalRequestRecord, fallback = 1000) {
  const store = getStore();
  const land = store.lands.get(request.landId);
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

  const store = getStore();
  const request = store.rentalRequests.get(body.rentalRequestId);

  if (!request) {
    return failure(c, 404, "NOT_FOUND", "Rental request not found");
  }

  if (request.tenantId !== authUser.id && authUser.role !== "admin") {
    return failure(c, 403, "FORBIDDEN", "Only tenant or admin can start payment");
  }

  if (!["approved", "pending_payment"].includes(request.status)) {
    return failure(c, 422, "BUSINESS_RULE_VIOLATION", "Rental request is not payable");
  }

  const now = new Date().toISOString();
  const payment: PaymentRecord = {
    id: `pay_${crypto.randomUUID()}`,
    rentalRequestId: request.id,
    amount: computePaymentAmount(request),
    currency: body.currency,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

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
            unit_amount: Math.round(payment.amount * 100),
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

    payment.stripeSessionId = session.id;
    payment.checkoutUrl = session.url ?? undefined;
  } else {
    payment.stripeSessionId = `cs_dev_${crypto.randomUUID()}`;
    payment.checkoutUrl = body.successUrl;
  }

  store.payments.set(payment.id, payment);
  store.rentalRequests.set(request.id, {
    ...request,
    status: "pending_payment",
    updatedAt: now,
  });

  createAuditEvent({
    actor: authUser,
    entity: "payment",
    action: "created",
    entityId: payment.id,
    metadata: {
      rentalRequestId: request.id,
      stripeSessionId: payment.stripeSessionId,
      amount: payment.amount,
      currency: payment.currency,
    },
  });

  return success(
    c,
    {
      paymentId: payment.id,
      stripeSessionId: payment.stripeSessionId,
      checkoutUrl: payment.checkoutUrl,
      status: payment.status,
    },
    201,
  );
});

paymentRoutes.get("/payments", requireAuth, (c) => {
  const authUser = c.get("authUser");
  const store = getStore();

  const rentalRequestId = c.req.query("rentalRequestId");
  const contractId = c.req.query("contractId");
  const status = c.req.query("status");

  let items = Array.from(store.payments.values()).filter((payment) => {
    const request = store.rentalRequests.get(payment.rentalRequestId);
    if (!request) {
      return authUser.role === "admin";
    }
    return authUser.role === "admin" || request.tenantId === authUser.id;
  });

  if (rentalRequestId) {
    items = items.filter((payment) => payment.rentalRequestId === rentalRequestId);
  }
  if (contractId) {
    items = items.filter((payment) => payment.contractId === contractId);
  }
  if (status) {
    items = items.filter((payment) => payment.status === status);
  }

  items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return success(c, items);
});

paymentRoutes.get("/payments/:paymentId", requireAuth, (c) => {
  const authUser = c.get("authUser");
  const store = getStore();
  const payment = store.payments.get(c.req.param("paymentId"));

  if (!payment) {
    return failure(c, 404, "NOT_FOUND", "Payment not found");
  }

  const request = store.rentalRequests.get(payment.rentalRequestId);
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
  if (env.stripeWebhookSecret) {
    const signature = c.req.header("stripe-signature");
    if (!signature) {
      return failure(c, 401, "UNAUTHORIZED", "Missing stripe-signature header");
    }
  }

  const payload = await c.req.json().catch(() => null);
  const store = getStore();

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

  const payment = store.payments.get(paymentId);
  if (!payment) {
    return failure(c, 404, "NOT_FOUND", "Payment not found");
  }

  if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
    payment.status = "paid";
    payment.stripePaymentIntentId =
      event.data?.object?.payment_intent || payment.stripePaymentIntentId;
  } else if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") {
    payment.status = "failed";
  }

  payment.updatedAt = new Date().toISOString();
  store.payments.set(payment.id, payment);

  const request = store.rentalRequests.get(payment.rentalRequestId);
  if (request && payment.status === "paid") {
    store.rentalRequests.set(request.id, {
      ...request,
      status: "paid",
      updatedAt: new Date().toISOString(),
    });
  }

  return success(c, {
    received: true,
    paymentId: payment.id,
    status: payment.status,
  });
});
