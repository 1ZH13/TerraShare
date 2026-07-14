import { z, type ZodRawShape } from "zod";
import { CreateRefundSchema } from "@terrashare/shared";

import { Payment } from "@backend/db/schemas";
import { createAuditEvent } from "@backend/store/audit";
import type { ActingUser } from "../context";
import { getStripeClient } from "../lib/stripe";
import { ToolError, type ToolDefinition } from "./define-tool";

/**
 * Tool HU-80 (#197): Reembolsar un pago (admin). Espeja
 * `POST /payments/:paymentId/refund`: reembolso total o parcial de un pago
 * pagado, con Stripe real cuando hay clave, actualización del estado del pago y
 * auditoría. Es una **acción sensible**: exige `confirm: true`.
 */

// El `inputSchema` que anuncia el SDK se declara con el Zod local (con
// `.describe()`); el importe/razón se validan con `CreateRefundSchema.parse`.
// Tipado como `ZodRawShape` para que `TOOLS` unifique en server.ts.
export const refundPaymentInput: ZodRawShape = {
  paymentId: z.string().min(1).describe("ID del pago a reembolsar"),
  amount: z
    .number()
    .positive()
    .optional()
    .describe("Importe a reembolsar; si se omite, reembolsa el saldo pendiente (total)"),
  reason: z.string().max(500).optional().describe("Motivo del reembolso (auditoría)"),
  confirm: z
    .boolean()
    .describe("Confirmación explícita obligatoria de esta acción sensible (debe ser true)"),
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Resultado de la tool (sin secretos de Stripe). */
export interface RefundResult {
  paymentId: string;
  status: string;
  amount: number;
  refundedAmount: number;
  refund: { id: string; amount: number; reason?: string; stripeRefundId?: string };
  currency: string;
}

/**
 * Lógica pura (testeable): valida, reembolsa total/parcial (Stripe si procede) y
 * actualiza el pago. El acceso admin lo garantiza `requires: "admin"` en la tool.
 */
export async function refundPayment(
  rawInput: unknown,
  actingUser: Pick<ActingUser, "id" | "role">,
): Promise<RefundResult> {
  const input = (rawInput ?? {}) as Record<string, unknown>;

  // Acción sensible: exige confirmación explícita.
  if (input.confirm !== true) {
    throw new ToolError("Esta acción sensible requiere confirmación explícita (confirm: true)");
  }

  const paymentId = typeof input.paymentId === "string" ? input.paymentId : "";
  if (!paymentId) throw new ToolError("paymentId es requerido");

  // Valida importe/razón con el mismo schema que la API REST.
  const body = CreateRefundSchema.parse({ amount: input.amount, reason: input.reason });

  const payment = await Payment.findOne({ id: paymentId }).lean();
  if (!payment) throw new ToolError("Pago no encontrado");

  if (payment.status !== "paid" && payment.status !== "partially_refunded") {
    throw new ToolError("Solo se pueden reembolsar pagos pagados");
  }

  const alreadyRefunded = payment.refundedAmount ?? 0;
  const refundable = round2(payment.amount - alreadyRefunded);
  if (refundable <= 0) {
    throw new ToolError("El pago ya está totalmente reembolsado");
  }

  const requested = body.amount != null ? round2(body.amount) : refundable;
  if (requested <= 0) throw new ToolError("El importe del reembolso debe ser positivo");
  if (requested > refundable) throw new ToolError("El importe excede el saldo reembolsable");

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
          metadata: { paymentId: payment.id, note: body.reason ?? "" },
        },
        { idempotencyKey: refundId },
      );
      stripeRefundId = refund.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error de Stripe al reembolsar";
      throw new ToolError(`Stripe rechazó el reembolso: ${message}`);
    }
  }

  const newRefundedAmount = round2(alreadyRefunded + requested);
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
          reason: body.reason,
          stripeRefundId,
          createdAt: new Date(),
        },
      },
    },
  );

  await createAuditEvent({
    actor: { id: actingUser.id, role: actingUser.role },
    entity: "payment",
    action: "refunded",
    entityId: payment.id,
    metadata: {
      refundId,
      amount: requested,
      reason: body.reason,
      refundedAmount: newRefundedAmount,
      status: newStatus,
      stripeRefundId,
    },
  });

  return {
    paymentId: payment.id,
    status: newStatus,
    amount: payment.amount,
    refundedAmount: newRefundedAmount,
    refund: { id: refundId, amount: requested, reason: body.reason, stripeRefundId },
    currency: payment.currency,
  };
}

/**
 * Definición de la tool. `requires: "admin"` → solo administradores; el
 * andamiaje aplica la puerta. Acción sensible: exige `confirm: true`.
 */
export const refundPaymentTool: ToolDefinition<typeof refundPaymentInput> = {
  name: "refund_payment",
  title: "Reembolsar pago (admin)",
  description:
    "Emite un reembolso total o parcial de un pago pagado (solo admin). Acción sensible: requiere confirm: true. Devuelve el estado del pago y el reembolso aplicado.",
  inputSchema: refundPaymentInput,
  requires: "admin",
  handler: (args, ctx) => {
    const actingUser = ctx.actingUser as ActingUser;
    return refundPayment(args, { id: actingUser.id, role: actingUser.role });
  },
};
