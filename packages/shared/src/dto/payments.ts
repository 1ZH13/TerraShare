import type { BusinessCurrency } from "../types/domain";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

/** Reembolso registrado sobre un pago (HU-43 #161). */
export interface RefundDto {
  id: string;
  amount: number;
  reason?: string;
  stripeRefundId?: string;
  createdAt: string;
}

export interface PaymentDto {
  id: string;
  rentalRequestId: string;
  contractId?: string;
  amount: number;
  currency: BusinessCurrency;
  status: PaymentStatus;
  /** Total reembolsado acumulado (HU-43 #161). */
  refundedAmount?: number;
  refunds?: RefundDto[];
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Cuerpo del endpoint de reembolso (total si se omite `amount`). */
export interface CreateRefundDto {
  amount?: number;
  reason?: string;
}

/** Recibo/factura descargable de un pago (HU-43 #161). */
export interface ReceiptDto {
  receiptNumber: string;
  issuedAt: string;
  paymentId: string;
  rentalRequestId: string;
  status: PaymentStatus;
  currency: BusinessCurrency;
  amount: number;
  platformFeeAmount?: number;
  netAmount?: number;
  refundedAmount?: number;
  refunds: RefundDto[];
  paidAt?: string;
  issuer: { name: string; taxId?: string };
  customer: { id: string; name?: string; email?: string };
  land?: { id: string; title?: string };
}

export interface CreateCheckoutSessionDto {
  rentalRequestId: string;
  currency: BusinessCurrency;
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentListFilterDto {
  rentalRequestId?: string;
  contractId?: string;
  status?: PaymentStatus;
}

export interface StripeWebhookEventDto {
  id: string;
  type: string;
  created: number;
  data: {
    object: Record<string, unknown>;
  };
}
