import { z } from "zod";

export const PaymentStatusSchema = z.enum([
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
] as const);

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