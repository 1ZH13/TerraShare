import { z } from "zod";

/**
 * Nombre del header de clave de idempotencia (HU-42 #160). Compartido para que
 * frontend y backend usen exactamente el mismo nombre en operaciones de pago.
 */
export const IDEMPOTENCY_HEADER = "Idempotency-Key";

export const PaymentStatusSchema = z.enum([
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "refunded",
  "partially_refunded",
] as const);

/** Cuerpo del reembolso (HU-43 #161): total si se omite `amount`. */
export const CreateRefundSchema = z.object({
  amount: z.number().positive("El importe debe ser positivo").optional(),
  reason: z.string().max(500).optional(),
});

export type CreateRefundInput = z.input<typeof CreateRefundSchema>;
export type CreateRefundOutput = z.output<typeof CreateRefundSchema>;

export const CreatePaymentIntentSchema = z.object({
  rentalRequestId: z.string().min(1, "ID de solicitud requerido"),
  currency: z.enum(["USD", "PAB"]),
});

export type CreatePaymentIntentInput = z.input<typeof CreatePaymentIntentSchema>;
export type CreatePaymentIntentOutput = z.output<typeof CreatePaymentIntentSchema>;

export const CreateCheckoutSessionSchema = z.object({
  rentalRequestId: z.string().min(1, "ID de solicitud requerido"),
  currency: z.enum(["USD", "PAB"]),
  successUrl: z.string().url("URL de éxito inválida"),
  cancelUrl: z.string().url("URL de cancelación inválida"),
});

export type CreateCheckoutSessionInput = z.input<typeof CreateCheckoutSessionSchema>;
export type CreateCheckoutSessionOutput = z.output<typeof CreateCheckoutSessionSchema>;

export const PaymentListFilterSchema = z.object({
  rentalRequestId: z.string().optional(),
  contractId: z.string().optional(),
  status: PaymentStatusSchema.optional(),
});

export type PaymentListFilterInput = z.input<typeof PaymentListFilterSchema>;
export type PaymentListFilterOutput = z.output<typeof PaymentListFilterSchema>;