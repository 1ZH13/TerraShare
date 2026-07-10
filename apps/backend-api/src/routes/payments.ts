import { Hono } from "hono";
import Stripe from "stripe";

import { env } from "../config/env";
import { failure, success } from "../lib/api-response";
import { requireAuth, requireAdmin } from "../middleware/require-auth";
import { createAuditEvent } from "../store/audit";
import { Payment, RentalRequest, Land, Contract, User } from "../db/schemas";
import {
  canInitiatePayment,
  canReadPayment,
} from "../lib/auth-helpers";
import { buildReceipt } from "../lib/payments-receipt";
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

type PaymentLean = {
  id: string;
  rentalRequestId: string;
  status: string;
};

/**
 * Aplica una transición de estado del pago de forma idempotente. Al pasar a
 * "paid" (y solo si no lo estaba ya) marca la solicitud como pagada y crea el
 * contrato en borrador. Reutilizado por el webhook de Stripe y por el endpoint
 * de confirmación (que verifica el estado directamente contra Stripe).
 */
async function applyPaidTransition(
  payment: PaymentLean,
  newStatus: string,
  extras: { paymentIntentId?: string; stripeSessionId?: string } = {},
): Promise<void> {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (newStatus !== payment.status) {
    updateData.status = newStatus;
  }
  if (extras.paymentIntentId) {
    updateData.stripePaymentIntentId = extras.paymentIntentId;
  }
  if (extras.stripeSessionId) {
    updateData.stripeSessionId = extras.stripeSessionId;
  }

  await Payment.updateOne({ id: payment.id }, updateData);

  if (newStatus === "paid" && payment.status !== "paid") {
    await RentalRequest.updateOne(
      { id: payment.rentalRequestId },
      { status: "paid", updatedAt: new Date() },
    );

    // Auto-create a draft contract for the now-paid rental. Idempotent: a
    // webhook can be delivered more than once, so skip if one already exists.
    const existingContract = await Contract.findOne({ rentalRequestId: payment.rentalRequestId }).lean();
    if (!existingContract) {
      const request = await RentalRequest.findOne({ id: payment.rentalRequestId }).lean();
      if (request) {
        const land = await Land.findOne({ id: request.landId }).lean();
        const nowIso = new Date().toISOString();
        await Contract.create({
          id: `contract_${crypto.randomUUID()}`,
          rentalRequestId: request.id,
          ownerId: land?.ownerId ?? "",
          tenantId: request.tenantId,
          terms: {
            summary: `Contrato de alquiler para ${land?.title ?? request.landId}`,
            startsAt: request.period?.startDate ?? nowIso,
            endsAt: request.period?.endDate ?? nowIso,
          },
          status: "draft",
        });
      }
    }
  }
}

export const paymentRoutes = new Hono<AppEnv>();

paymentRoutes.post("/payments/create-intent", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const body = (await c.req.json().catch(() => null)) as { rentalRequestId?: string; currency?: "USD" | "PAB" } | null;

  if (!body?.rentalRequestId || !body.currency) {
    return failure(c, 400, "VALIDATION_ERROR", "Missing rentalRequestId or currency");
  }

  const request = await RentalRequest.findOne({ id: body.rentalRequestId }).lean();
  if (!request) {
    return failure(c, 404, "NOT_FOUND", "Rental request not found");
  }

  if (!canInitiatePayment(authUser, request)) {
    return failure(c, 403, "FORBIDDEN", "Only tenant or admin can start payment");
  }

  if (!["approved", "pending_payment"].includes(request.status)) {
    return failure(c, 422, "BUSINESS_RULE_VIOLATION", "Rental request is not payable");
  }

  const amount = await computePaymentAmount(request.id);
  const stripe = getStripeClient();

  if (!stripe) {
    return failure(c, 503, "STRIPE_NOT_CONFIGURED", "Stripe is not configured");
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: body.currency.toLowerCase(),
    metadata: {
      paymentId: `pay_${crypto.randomUUID()}`,
      rentalRequestId: request.id,
    },
    automatic_payment_methods: { enabled: true },
  });

  const payment = await Payment.create({
    id: paymentIntent.metadata.paymentId,
    rentalRequestId: request.id,
    amount,
    currency: body.currency,
    status: "pending",
    stripePaymentIntentId: paymentIntent.id,
  });

  await RentalRequest.updateOne(
    { id: request.id },
    { status: "pending_payment", updatedAt: new Date() },
  );

  await createAuditEvent({
    actor: authUser,
    entity: "payment",
    action: "created",
    entityId: payment.id,
    metadata: { rentalRequestId: request.id, amount, currency: body.currency },
  });

  return success(c, {
    paymentId: payment.id,
    clientSecret: paymentIntent.client_secret,
    amount,
    currency: body.currency,
  }, 201);
});

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

  if (!canInitiatePayment(authUser, request)) {
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

  await createAuditEvent({
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
    const ownerLandIds = (await Land.find({ ownerId: authUser.id }).lean()).map((l) => l.id);
    const requests = await RentalRequest.find({
      $or: [{ tenantId: authUser.id }, { landId: { $in: ownerLandIds } }],
    }).select("id").lean();
    const requestIds = requests.map((r) => r.id);
    if (requestIds.length === 0) {
      return success(c, []);
    }
    if (rentalRequestId) {
      if (!requestIds.includes(rentalRequestId)) {
        return failure(c, 403, "FORBIDDEN", "Cannot access payment for another user's rental request");
      }
      query.rentalRequestId = rentalRequestId;
    } else {
      query.rentalRequestId = { $in: requestIds };
    }
  } else {
    if (rentalRequestId) query.rentalRequestId = rentalRequestId;
  }

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
  if (!request) {
    return failure(c, 404, "NOT_FOUND", "Related rental request not found");
  }

  const land = await Land.findOne({ id: request.landId }).lean();
  if (!canReadPayment(authUser, request, land ?? { ownerId: "" })) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this payment");
  }

  return success(c, payment);
});

/**
 * Confirma un pago consultando su estado directamente en Stripe, sin depender
 * de que el webhook llegue (clave en local, donde Stripe no alcanza a
 * `localhost` sin `stripe listen`). Idempotente y reutiliza la misma transición
 * que el webhook.
 */
paymentRoutes.post("/payments/confirm", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const body = (await c.req.json().catch(() => null)) as
    | { rentalRequestId?: string; paymentId?: string }
    | null;

  if (!body?.rentalRequestId && !body?.paymentId) {
    return failure(c, 400, "VALIDATION_ERROR", "Missing rentalRequestId or paymentId");
  }

  const payment = body.paymentId
    ? await Payment.findOne({ id: body.paymentId }).lean()
    : await Payment.findOne({ rentalRequestId: body.rentalRequestId }).sort({ createdAt: -1 }).lean();

  if (!payment) {
    return failure(c, 404, "NOT_FOUND", "Payment not found");
  }

  const request = await RentalRequest.findOne({ id: payment.rentalRequestId }).lean();
  if (request && request.tenantId !== authUser.id && authUser.role !== "admin") {
    return failure(c, 403, "FORBIDDEN", "Not allowed to confirm this payment");
  }

  if (payment.status === "paid") {
    return success(c, {
      paymentId: payment.id,
      rentalRequestId: payment.rentalRequestId,
      status: "paid",
    });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return success(c, {
      paymentId: payment.id,
      rentalRequestId: payment.rentalRequestId,
      status: payment.status,
      stripeConfigured: false,
    });
  }

  let paidAtStripe = false;
  let resolvedIntentId = payment.stripePaymentIntentId;

  try {
    const sessionId = payment.stripeSessionId;
    if (sessionId && sessionId.startsWith("cs_") && !sessionId.startsWith("cs_dev_")) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      paidAtStripe = session.payment_status === "paid";
      resolvedIntentId = extractPaymentIntentId(session.payment_intent) ?? resolvedIntentId;
    } else if (payment.stripePaymentIntentId) {
      const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
      paidAtStripe = intent.status === "succeeded";
    }
  } catch (err) {
    console.error("Stripe confirm retrieval failed:", err);
    return failure(c, 503, "INTERNAL_ERROR", "No se pudo verificar el pago con Stripe");
  }

  if (paidAtStripe) {
    await applyPaidTransition(payment, "paid", { paymentIntentId: resolvedIntentId });
    await createAuditEvent({
      actor: authUser,
      entity: "payment",
      action: "paid",
      entityId: payment.id,
      metadata: { rentalRequestId: payment.rentalRequestId, via: "confirm" },
    });
  }

  return success(c, {
    paymentId: payment.id,
    rentalRequestId: payment.rentalRequestId,
    status: paidAtStripe ? "paid" : payment.status,
  });
});

/**
 * Reembolso total o parcial de un pago (HU-43 #161). Solo admin. Valida el
 * importe reembolsable, ejecuta el reembolso en Stripe (si está configurado),
 * actualiza el estado/acumulado del pago y registra auditoría.
 */
paymentRoutes.post("/payments/:paymentId/refund", requireAuth, requireAdmin, async (c) => {
  const authUser = c.get("authUser");
  const paymentId = c.req.param("paymentId");
  const body = (await c.req.json().catch(() => null)) as { amount?: number; reason?: string } | null;

  const payment = await Payment.findOne({ id: paymentId }).lean();
  if (!payment) {
    return failure(c, 404, "NOT_FOUND", "Payment not found");
  }

  if (payment.status !== "paid" && payment.status !== "partially_refunded") {
    return failure(c, 422, "BUSINESS_RULE_VIOLATION", "Only paid payments can be refunded");
  }

  const alreadyRefunded = payment.refundedAmount ?? 0;
  const refundable = Math.round((payment.amount - alreadyRefunded) * 100) / 100;
  if (refundable <= 0) {
    return failure(c, 422, "BUSINESS_RULE_VIOLATION", "Payment is already fully refunded");
  }

  const requested = body?.amount != null ? Math.round(body.amount * 100) / 100 : refundable;
  if (requested <= 0) {
    return failure(c, 400, "VALIDATION_ERROR", "Refund amount must be positive");
  }
  if (requested > refundable) {
    return failure(c, 422, "BUSINESS_RULE_VIOLATION", "Refund amount exceeds refundable balance");
  }

  const refundId = `rf_${crypto.randomUUID()}`;
  let stripeRefundId: string | undefined;

  const stripe = getStripeClient();
  if (stripe && payment.stripePaymentIntentId) {
    try {
      const refund = await stripe.refunds.create(
        {
          payment_intent: payment.stripePaymentIntentId,
          amount: Math.round(requested * 100),
          reason: "requested_by_customer",
          metadata: { paymentId: payment.id, note: body?.reason ?? "" },
        },
        // Idempotencia hacia Stripe: el propio id del reembolso.
        { idempotencyKey: refundId },
      );
      stripeRefundId = refund.id;
    } catch (err) {
      console.error("Stripe refund failed:", err);
      return failure(c, 500, "INTERNAL_ERROR", "No se pudo procesar el reembolso en Stripe");
    }
  }

  const newRefundedAmount = Math.round((alreadyRefunded + requested) * 100) / 100;
  const newStatus = newRefundedAmount >= payment.amount ? "refunded" : "partially_refunded";

  await Payment.updateOne(
    { id: payment.id },
    {
      status: newStatus,
      refundedAmount: newRefundedAmount,
      updatedAt: new Date(),
      $push: {
        refunds: {
          id: refundId,
          amount: requested,
          reason: body?.reason,
          stripeRefundId,
          createdAt: new Date(),
        },
      },
    },
  );

  await createAuditEvent({
    actor: authUser,
    entity: "payment",
    action: "refunded",
    entityId: payment.id,
    metadata: {
      refundId,
      amount: requested,
      reason: body?.reason,
      refundedAmount: newRefundedAmount,
      status: newStatus,
      stripeRefundId,
    },
  });

  const updated = await Payment.findOne({ id: payment.id }).lean();
  return success(c, updated);
});

/**
 * Recibo/factura descargable de un pago (HU-43 #161). Accesible por el
 * arrendatario, el propietario del terreno o un admin. El frontend renderiza e
 * imprime/descarga a partir de estos datos.
 */
paymentRoutes.get("/payments/:paymentId/receipt", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const paymentId = c.req.param("paymentId");

  const payment = await Payment.findOne({ id: paymentId }).lean();
  if (!payment) {
    return failure(c, 404, "NOT_FOUND", "Payment not found");
  }

  const request = await RentalRequest.findOne({ id: payment.rentalRequestId }).lean();
  if (!request) {
    return failure(c, 404, "NOT_FOUND", "Related rental request not found");
  }

  const land = await Land.findOne({ id: request.landId }).lean();
  if (!canReadPayment(authUser, request, land ?? { ownerId: "" })) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this receipt");
  }

  const customerDoc = await User.findOne({ clerkUserId: request.tenantId }).lean();

  const receipt = buildReceipt({
    payment,
    land: land ? { id: land.id, title: land.title } : undefined,
    customer: {
      id: request.tenantId,
      name: customerDoc?.profile?.fullName,
      email: customerDoc?.email,
    },
  });

  return success(c, receipt);
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

  await applyPaidTransition(payment, newStatus, { paymentIntentId, stripeSessionId });

  return success(c, {
    received: true,
    paymentId: payment.id,
    status: newStatus,
  });
});
