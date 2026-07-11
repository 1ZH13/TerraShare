import { Hono } from "hono";
import type { Context } from "hono";
import Stripe from "stripe";
import {
  CreatePaymentIntentSchema,
  CreateCheckoutSessionSchema,
  CreateRefundSchema,
} from "@terrashare/shared";

import { env } from "../config/env";
import { failure, success } from "../lib/api-response";
import { validateBody } from "../lib/validate";
import { requireAuth, requireAdmin } from "../middleware/require-auth";
import { verifyStripeWebhook, WebhookVerificationError } from "../lib/stripe-webhook";
import { createAuditEvent, SYSTEM_ACTOR } from "../store/audit";
import { Payment, RentalRequest, Land, Contract, User } from "../db/schemas";
import {
  canInitiatePayment,
  canReadPayment,
} from "../lib/auth-helpers";
import {
  computePaymentBreakdown,
  stripeChargeCurrency,
  toStripeMinorUnits,
} from "../lib/payments-money";
import { buildReconciliationReport } from "../lib/payments-reconciliation";
import {
  findPaymentIdByIdempotencyKey,
  reserveIdempotencyKey,
  isWebhookProcessed,
  markWebhookProcessed,
} from "../lib/payments-idempotency";
import { buildReceipt } from "../lib/payments-receipt";
import { mapStripeError } from "../lib/stripe-errors";
import type { AppEnv } from "../types";

let stripeClient: Stripe | null = null;

type StripeEventObject = {
  id?: string;
  metadata?: Record<string, string>;
  payment_intent?: string | { id?: string } | null;
  client_reference_id?: string | null;
};

type StripeWebhookEvent = {
  id?: string;
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

  // Compra/venta (#249): se cobra la oferta acordada, o el precio de venta del
  // terreno como respaldo. El alquiler cobra el precio mensual (primer mes).
  if (request.operation === "venta") {
    return request.offerAmount ?? land?.salePrice ?? fallback;
  }

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

/**
 * Respuesta idempotente de create-intent: reconstruye la forma habitual a
 * partir del pago ya creado. Recupera el `client_secret` desde Stripe cuando es
 * posible para que el cliente pueda continuar el pago. (HU-42 #160)
 */
async function existingIntentResponse(c: Context<AppEnv>, paymentId: string) {
  const payment = await Payment.findOne({ id: paymentId }).lean();
  if (!payment) {
    return failure(c, 404, "NOT_FOUND", "Payment not found");
  }

  let clientSecret: string | null | undefined;
  const stripe = getStripeClient();
  if (stripe && payment.stripePaymentIntentId) {
    try {
      const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
      clientSecret = intent.client_secret;
    } catch (err) {
      console.error("Stripe intent retrieval failed on idempotent replay:", err);
    }
  }

  return success(c, {
    paymentId: payment.id,
    clientSecret,
    amount: payment.amount,
    currency: payment.currency,
    idempotent: true,
  });
}

/** Respuesta idempotente de checkout-session: reutiliza la sesión ya creada. */
async function existingSessionResponse(c: Context<AppEnv>, paymentId: string) {
  const payment = await Payment.findOne({ id: paymentId }).lean();
  if (!payment) {
    return failure(c, 404, "NOT_FOUND", "Payment not found");
  }

  return success(c, {
    paymentId: payment.id,
    stripeSessionId: payment.stripeSessionId,
    checkoutUrl: payment.checkoutUrl,
    status: payment.status,
    idempotent: true,
  });
}

/**
 * Registra el rechazo de un webhook de Stripe (HU-33 #152): log estructurado
 * para observabilidad inmediata + evento de auditoría durable. El actor es el
 * sistema porque el webhook llega sin usuario autenticado. La persistencia va
 * envuelta en try/catch para no convertir un fallo de auditoría en un 500 que
 * Stripe reintentaría en bucle.
 */
async function recordRejectedWebhook(
  reason: string,
  details: { hasSignature: boolean } & Record<string, unknown>,
): Promise<void> {
  console.error(`[stripe-webhook] rejected: ${reason}`, details);
  try {
    await createAuditEvent({
      actor: SYSTEM_ACTOR,
      entity: "webhook",
      action: "rejected",
      entityId: "unknown",
      metadata: { source: "stripe", reason, ...details },
    });
  } catch (auditErr) {
    console.error("[stripe-webhook] failed to persist rejection audit event:", auditErr);
  }
}

export const paymentRoutes = new Hono<AppEnv>();

paymentRoutes.post("/payments/create-intent", requireAuth, async (c) => {
  const authUser = c.get("authUser");

  const parsed = await validateBody(c, CreatePaymentIntentSchema);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

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

  const idempotencyKey = c.req.header("idempotency-key");

  // Reintento con la misma clave → devolver el pago ya creado, sin volver a
  // cobrar ni crear un duplicado (HU-42 #160).
  if (idempotencyKey) {
    const existingId = await findPaymentIdByIdempotencyKey(idempotencyKey);
    if (existingId) {
      return existingIntentResponse(c, existingId);
    }
  }

  const amount = await computePaymentAmount(request.id);
  const breakdown = computePaymentBreakdown(amount, body.currency, env.platformFeeBps);
  const stripe = getStripeClient();

  if (!stripe) {
    return failure(c, 503, "STRIPE_NOT_CONFIGURED", "Stripe is not configured");
  }

  const paymentId = `pay_${crypto.randomUUID()}`;

  // Reservar la clave antes de crear: si una petición concurrente ganó la
  // carrera, devolvemos su pago en lugar de crear otro.
  if (idempotencyKey) {
    const reserved = await reserveIdempotencyKey(idempotencyKey, "create-intent", paymentId);
    if (!reserved) {
      const winnerId = await findPaymentIdByIdempotencyKey(idempotencyKey);
      if (winnerId) return existingIntentResponse(c, winnerId);
    }
  }

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: toStripeMinorUnits(breakdown.grossAmount),
      currency: stripeChargeCurrency(body.currency),
      metadata: {
        paymentId,
        rentalRequestId: request.id,
        presentmentCurrency: body.currency,
        platformFeeAmount: String(breakdown.platformFeeAmount),
        netAmount: String(breakdown.netAmount),
      },
      automatic_payment_methods: { enabled: true },
    },
    // Clave de idempotencia hacia Stripe: la del cliente si la hay, o el propio
    // paymentId (estable dentro de esta petición).
    { idempotencyKey: idempotencyKey ?? paymentId },
  );

  const payment = await Payment.create({
    id: paymentId,
    rentalRequestId: request.id,
    amount: breakdown.grossAmount,
    currency: body.currency,
    platformFeeAmount: breakdown.platformFeeAmount,
    netAmount: breakdown.netAmount,
    settlementCurrency: breakdown.settlementCurrency,
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

  const parsed = await validateBody(c, CreateCheckoutSessionSchema);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

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

  const idempotencyKey = c.req.header("idempotency-key");

  // Reintento con la misma clave → devolver la sesión ya creada (HU-42 #160).
  if (idempotencyKey) {
    const existingId = await findPaymentIdByIdempotencyKey(idempotencyKey);
    if (existingId) {
      return existingSessionResponse(c, existingId);
    }
  }

  const amount = await computePaymentAmount(request.id);
  const breakdown = computePaymentBreakdown(amount, body.currency, env.platformFeeBps);
  const paymentId = `pay_${crypto.randomUUID()}`;

  // Reservar la clave antes de crear: si otra petición concurrente ganó la
  // carrera, devolvemos su sesión en lugar de crear otra.
  if (idempotencyKey) {
    const reserved = await reserveIdempotencyKey(idempotencyKey, "checkout-session", paymentId);
    if (!reserved) {
      const winnerId = await findPaymentIdByIdempotencyKey(idempotencyKey);
      if (winnerId) return existingSessionResponse(c, winnerId);
    }
  }

  const payment = await Payment.create({
    id: paymentId,
    rentalRequestId: request.id,
    amount: breakdown.grossAmount,
    currency: body.currency,
    platformFeeAmount: breakdown.platformFeeAmount,
    netAmount: breakdown.netAmount,
    settlementCurrency: breakdown.settlementCurrency,
    status: "pending",
  });

  const stripe = getStripeClient();

  if (stripe) {
    const feeMetadata = {
      presentmentCurrency: body.currency,
      platformFeeAmount: String(breakdown.platformFeeAmount),
      netAmount: String(breakdown.netAmount),
    };
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: payment.id,
      success_url: body.successUrl,
      cancel_url: body.cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: stripeChargeCurrency(body.currency),
            unit_amount: toStripeMinorUnits(breakdown.grossAmount),
            product_data: {
              name: `TerraShare rental ${request.id}`,
            },
          },
        },
      ],
      metadata: {
        paymentId: payment.id,
        rentalRequestId: request.id,
        ...feeMetadata,
      },
      payment_intent_data: {
        metadata: {
          paymentId: payment.id,
          rentalRequestId: request.id,
          ...feeMetadata,
        },
      },
    }, { idempotencyKey: idempotencyKey ?? payment.id });

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

/**
 * Reporte de conciliación (HU-41 #159): totales por moneda (bruto/comisión/neto)
 * y discrepancias entre pagos, solicitudes y contratos. Solo admin. Se registra
 * antes de `/payments/:paymentId` para que "reconciliation" no se interprete
 * como un id de pago.
 */
paymentRoutes.get("/payments/reconciliation", requireAuth, requireAdmin, async (c) => {
  const report = await buildReconciliationReport();
  return success(c, report);
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
    const mapped = mapStripeError(err);
    return failure(c, mapped.status, mapped.code, mapped.message);
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

  const parsed = await validateBody(c, CreateRefundSchema);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

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
      const mapped = mapStripeError(err);
      return failure(c, mapped.status, mapped.code, mapped.message);
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

  // Solo podemos verificar cuando hay secret real y cliente Stripe. El
  // placeholder de desarrollo/pruebas no cuenta como configuración válida.
  const verificationConfigured =
    !!webhookSecret && webhookSecret !== "whsec_placeholder" && !!stripe;

  // En producción SIEMPRE se exige verificación (HU-33 #152). En desarrollo solo
  // se verifica cuando llega una firma (p.ej. `stripe listen`); los eventos
  // locales sin firma se procesan por el bypass de desarrollo, porque Stripe no
  // alcanza `localhost`.
  const mustVerify = !isDev || (verificationConfigured && !!signature);

  let event: StripeWebhookEvent;

  if (mustVerify) {
    if (!verificationConfigured) {
      // Producción sin verificación configurada: fallamos cerrado. Nunca se
      // procesa un evento sin poder validar su firma.
      await recordRejectedWebhook("verification_not_configured", { hasSignature: !!signature });
      return failure(c, 500, "INTERNAL_ERROR", "Stripe webhook verification is not configured correctly");
    }

    try {
      event = (await verifyStripeWebhook({
        stripe: stripe!,
        rawBody,
        signature,
        secret: webhookSecret!,
      })) as unknown as StripeWebhookEvent;
    } catch (err) {
      if (err instanceof WebhookVerificationError) {
        await recordRejectedWebhook(err.reason, { hasSignature: !!signature });
        return failure(c, 400, "VALIDATION_ERROR", "Invalid webhook signature");
      }
      throw err;
    }
  } else {
    // Bypass de desarrollo: sin firma que validar, procesamos el JSON crudo.
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

  // Idempotencia de webhooks (HU-42 #160): si este mismo evento de Stripe ya se
  // procesó, no repetimos efectos. Solo aplica cuando llega un `event.id`
  // (siempre presente en producción; en pruebas/dev sin id se omite el dedupe).
  const eventId = event.id;
  if (eventId && (await isWebhookProcessed(eventId))) {
    return success(c, { received: true, duplicate: true, eventId });
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
    if (eventId) await markWebhookProcessed(eventId, eventType, payment.id);
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

  // Reservar el eventId antes de aplicar; si otra entrega concurrente ya lo
  // registró, no repetimos la transición.
  if (eventId) {
    const firstDelivery = await markWebhookProcessed(eventId, eventType, payment.id);
    if (!firstDelivery) {
      return success(c, { received: true, duplicate: true, eventId });
    }
  }

  await applyPaidTransition(payment, newStatus, { paymentIntentId, stripeSessionId });

  return success(c, {
    received: true,
    paymentId: payment.id,
    status: newStatus,
  });
});
