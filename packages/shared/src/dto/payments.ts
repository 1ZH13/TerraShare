import type { BusinessCurrency } from "../types/domain";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled";

export interface PaymentDto {
  id: string;
  rentalRequestId: string;
  contractId?: string;
  amount: number;
  currency: BusinessCurrency;
  status: PaymentStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
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
