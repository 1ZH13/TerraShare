import { z, type ZodRawShape } from "zod";
import { CreateCheckoutSessionSchema } from "@terrashare/shared";

import { Land, Payment, RentalRequest } from "@backend/db/schemas";
import { createAuditEvent } from "@backend/store/audit";
import {
  computePaymentBreakdown,
  stripeChargeCurrency,
  toStripeMinorUnits,
} from "@backend/lib/payments-money";
import type { ActingUser } from "../context";
import { canInitiatePayment } from "../permissions";
import { extractPaymentIntentId, getStripeClient, platformFeeBps } from "../lib/stripe";
import { ToolError, type ToolDefinition } from "./define-tool";

/**
 * Tool HU-77 (#194): Crear una sesión de pago. Espeja
 * `POST /payments/checkout-session`: valida forma con el MISMO
 * `CreateCheckoutSessionSchema`, verifica que el que actúa sea el arrendatario
 * (o admin) y que la solicitud sea PAGABLE, crea el pago y una sesión de Stripe
 * (o un fallback de desarrollo), y devuelve el `checkoutUrl` — **sin exponer
 * secretos de Stripe** (solo la URL pública de checkout y los ids de sesión).
 */

// El `inputSchema` que anuncia el SDK se declara con el Zod local (con
// `.describe()`); la validación real la hace `CreateCheckoutSessionSchema.parse`.
// Tipado como `ZodRawShape` para que `TOOLS` unifique en server.ts.
export const createPaymentSessionInput: ZodRawShape = {
  rentalRequestId: z.string().min(1).describe("ID de la solicitud a pagar"),
  currency: z.enum(["USD", "PAB"]).describe("Moneda de presentación"),
  successUrl: z.string().url().describe("URL de retorno tras el pago exitoso"),
  cancelUrl: z.string().url().describe("URL de retorno si se cancela el pago"),
};

/** Estados en los que una solicitud es pagable. */
const PAYABLE_STATUSES = ["approved", "pending_payment"];

/** Resultado de la tool: nunca incluye secretos de Stripe. */
export interface PaymentSessionResult {
  paymentId: string;
  stripeSessionId?: string;
  checkoutUrl?: string;
  status: string;
  amount: number;
  currency: string;
}

/** Monto a cobrar (espeja `computePaymentAmount` del backend). */
async function computeAmount(
  request: { operation?: string; offerAmount?: number; landId: string },
  fallback = 1000,
): Promise<number> {
  const land = await Land.findOne({ id: request.landId }).lean();
  if (request.operation === "venta") {
    return request.offerAmount ?? land?.salePrice ?? fallback;
  }
  return land?.priceRule?.pricePerMonth ?? fallback;
}

/**
 * Lógica pura (testeable): valida, verifica permiso y pagabilidad, crea el pago +
 * la sesión (Stripe real o fallback dev) y pasa la solicitud a `pending_payment`.
 */
export async function createPaymentSession(
  rawInput: unknown,
  actingUser: Pick<ActingUser, "id" | "role">,
): Promise<PaymentSessionResult> {
  const data = CreateCheckoutSessionSchema.parse(rawInput ?? {});

  const request = await RentalRequest.findOne({ id: data.rentalRequestId }).lean();
  if (!request) throw new ToolError("Solicitud no encontrada");

  // Misma regla que la API REST: solo el arrendatario (o un admin).
  if (!canInitiatePayment(actingUser as ActingUser, request)) {
    throw new ToolError("Solo el arrendatario o un admin pueden iniciar el pago");
  }

  if (!PAYABLE_STATUSES.includes(request.status)) {
    throw new ToolError("La solicitud no es pagable en su estado actual");
  }

  const amount = await computeAmount(request as { operation?: string; offerAmount?: number; landId: string });
  const breakdown = computePaymentBreakdown(amount, data.currency, platformFeeBps());
  const paymentId = `pay_${crypto.randomUUID()}`;

  await Payment.create({
    id: paymentId,
    rentalRequestId: request.id,
    amount: breakdown.grossAmount,
    currency: data.currency,
    platformFeeAmount: breakdown.platformFeeAmount,
    netAmount: breakdown.netAmount,
    settlementCurrency: breakdown.settlementCurrency,
    status: "pending",
  });

  const stripe = getStripeClient();
  if (stripe) {
    const feeMetadata = {
      presentmentCurrency: data.currency,
      platformFeeAmount: String(breakdown.platformFeeAmount),
      netAmount: String(breakdown.netAmount),
    };
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: paymentId,
        success_url: data.successUrl,
        cancel_url: data.cancelUrl,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: stripeChargeCurrency(data.currency),
              unit_amount: toStripeMinorUnits(breakdown.grossAmount),
              product_data: { name: `TerraShare rental ${request.id}` },
            },
          },
        ],
        metadata: { paymentId, rentalRequestId: request.id, ...feeMetadata },
        payment_intent_data: {
          metadata: { paymentId, rentalRequestId: request.id, ...feeMetadata },
        },
      },
      { idempotencyKey: paymentId },
    );

    await Payment.updateOne(
      { id: paymentId },
      {
        stripeSessionId: session.id,
        stripePaymentIntentId: extractPaymentIntentId(session.payment_intent),
        checkoutUrl: session.url ?? undefined,
      },
    );
  } else {
    // Fallback de desarrollo (sin clave real de Stripe): igual que el backend.
    await Payment.updateOne(
      { id: paymentId },
      { stripeSessionId: `cs_dev_${crypto.randomUUID()}`, checkoutUrl: data.successUrl },
    );
  }

  await RentalRequest.updateOne(
    { id: request.id },
    { status: "pending_payment", updatedAt: new Date() },
  );

  await createAuditEvent({
    actor: { id: actingUser.id, role: actingUser.role },
    entity: "payment",
    action: "created",
    entityId: paymentId,
    metadata: { rentalRequestId: request.id, amount, currency: data.currency },
  });

  const payment = await Payment.findOne({ id: paymentId }).lean();
  return {
    paymentId,
    stripeSessionId: payment?.stripeSessionId,
    checkoutUrl: payment?.checkoutUrl,
    status: payment?.status ?? "pending",
    amount: breakdown.grossAmount,
    currency: data.currency,
  };
}

/**
 * Definición de la tool. `requires: "user"` → necesita identidad; el permiso por
 * recurso (arrendatario/admin) lo aplica `canInitiatePayment`.
 */
export const createPaymentSessionTool: ToolDefinition<typeof createPaymentSessionInput> = {
  name: "create_payment_session",
  title: "Crear sesión de pago",
  description:
    "Genera un enlace de pago (checkoutUrl) para una solicitud pagable, a nombre del arrendatario autenticado. No expone secretos de Stripe. Devuelve el checkoutUrl y el estado del pago.",
  inputSchema: createPaymentSessionInput,
  requires: "user",
  handler: (args, ctx) => {
    const actingUser = ctx.actingUser as ActingUser;
    return createPaymentSession(args, { id: actingUser.id, role: actingUser.role });
  },
};
