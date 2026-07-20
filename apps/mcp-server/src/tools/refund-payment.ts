import { z, type ZodRawShape } from "zod";
import { CreateRefundSchema } from "@terrashare/shared";

import { Payment, RentalRequest } from "@backend/db/schemas";
import { createAuditEvent } from "@backend/store/audit";
import { config } from "../config";
import type { ActingUser } from "../context";
import { getStripeClient } from "../lib/stripe";
import { notifyUser } from "../lib/notify";
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
// La confirmación (capa A/B) la gestiona el andamiaje `registerTool` vía
// `sensitive`, que inyecta `confirm`/`confirmationToken` — no se declara aquí.
export const refundPaymentInput: ZodRawShape = {
  paymentId: z.string().min(1).describe("ID del pago a reembolsar"),
  amount: z
    .number()
    .positive()
    .optional()
    .describe("Importe a reembolsar; si se omite, reembolsa el saldo pendiente (total)"),
  reason: z.string().max(500).optional().describe("Motivo del reembolso (auditoría)"),
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

  // Capa D (#328): límite configurable de reembolso vía MCP.
  const maxAmount = config.refundMaxAmount;
  if (maxAmount != null && requested > maxAmount) {
    throw new ToolError(
      `El reembolso (${requested}) supera el límite permitido vía MCP (${maxAmount}). Procésalo desde el panel de administración.`,
    );
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

  // Capa E (#328): notifica al arrendatario (pagador) que su pago fue reembolsado.
  // Efecto secundario no crítico: un fallo aquí no revierte el reembolso ya aplicado.
  try {
    const request = await RentalRequest.findOne({ id: payment.rentalRequestId }).lean();
    if (request?.tenantId) {
      await notifyUser({
        userId: request.tenantId,
        type: "payment_refunded",
        title: "Reembolso procesado",
        body: `Se reembolsaron ${requested} ${payment.currency} de tu pago ${payment.id}.`,
      });
    }
  } catch (err) {
    console.error("[mcp-server] refund_payment: fallo al notificar al arrendatario", err);
  }

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
 * Vista previa (capa B, #328): resume el reembolso a confirmar SIN ejecutarlo.
 * Se muestra al agente en el 1er paso para que el humano vea monto y saldo.
 */
export async function refundPreview(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const paymentId = typeof args.paymentId === "string" ? args.paymentId : "";
  if (!paymentId) throw new ToolError("paymentId es requerido");

  const payment = await Payment.findOne({ id: paymentId }).lean();
  if (!payment) throw new ToolError("Pago no encontrado");

  const alreadyRefunded = payment.refundedAmount ?? 0;
  const refundable = round2(payment.amount - alreadyRefunded);
  const requested = typeof args.amount === "number" ? round2(args.amount) : refundable;
  const maxAmount = config.refundMaxAmount;

  return {
    paymentId: payment.id,
    currency: payment.currency,
    amount: payment.amount,
    alreadyRefunded,
    refundable,
    requested,
    reason: typeof args.reason === "string" ? args.reason : undefined,
    exceedsLimit: maxAmount != null && requested > maxAmount,
    limit: maxAmount ?? null,
  };
}

/**
 * Definición de la tool. `requires: "admin"` → solo administradores; el andamiaje
 * aplica la puerta. Acción sensible (#328): flujo de vista previa en 2 pasos (B),
 * con interruptor de configuración (F) y límite de importe (D, en la lógica).
 */
export const refundPaymentTool: ToolDefinition<typeof refundPaymentInput> = {
  name: "refund_payment",
  title: "Reembolsar pago (admin)",
  description:
    "Emite un reembolso total o parcial de un pago pagado (solo admin). Acción sensible: la 1ª llamada devuelve una vista previa y un confirmationToken; el reembolso se aplica al repetir la llamada con ese token. Devuelve el estado del pago y el reembolso aplicado.",
  inputSchema: refundPaymentInput,
  requires: "admin",
  sensitive: {
    preview: (args) => refundPreview(args),
    enabled: () => config.allowRefund,
  },
  handler: (args, ctx) => {
    const actingUser = ctx.actingUser as ActingUser;
    return refundPayment(args, { id: actingUser.id, role: actingUser.role });
  },
};
