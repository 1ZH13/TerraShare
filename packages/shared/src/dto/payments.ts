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
  /** Comisión de plataforma retenida sobre el bruto (HU-41 #159). */
  platformFeeAmount?: number;
  /** Neto a liquidar al propietario (bruto − comisión). */
  netAmount?: number;
  /** Moneda con la que se liquida en Stripe (PAB se cobra como USD 1:1). */
  settlementCurrency?: "USD";
  status: PaymentStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Tipos de discrepancia detectados en la conciliación (HU-41 #159). */
export type ReconciliationDiscrepancyType =
  | "payment_paid_request_not_paid"
  | "payment_paid_without_contract"
  | "request_paid_without_paid_payment"
  | "orphan_payment";

export interface ReconciliationDiscrepancyDto {
  type: ReconciliationDiscrepancyType;
  paymentId?: string;
  rentalRequestId?: string;
  contractId?: string;
  detail: string;
}

/** Totales de una moneda: brutos, comisiones y netos de los pagos pagados. */
export interface ReconciliationCurrencyTotalsDto {
  currency: BusinessCurrency;
  paidCount: number;
  grossAmount: number;
  platformFeeAmount: number;
  netAmount: number;
}

export interface ReconciliationReportDto {
  generatedAt: string;
  paymentsByStatus: Record<PaymentStatus, number>;
  totals: ReconciliationCurrencyTotalsDto[];
  discrepancies: ReconciliationDiscrepancyDto[];
  discrepancyCount: number;
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
