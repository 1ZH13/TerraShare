import type { PaymentStatus } from "../db/schemas";

/**
 * Construcción del recibo/factura de un pago (HU-43 #161). Puro y testeable:
 * recibe los documentos ya cargados y devuelve la forma del recibo que consume
 * el frontend para renderizar/descargar.
 */

export interface ReceiptRefund {
  id: string;
  amount: number;
  reason?: string;
  stripeRefundId?: string;
  createdAt: string;
}

export interface Receipt {
  receiptNumber: string;
  issuedAt: string;
  paymentId: string;
  rentalRequestId: string;
  status: PaymentStatus;
  currency: "USD" | "PAB";
  amount: number;
  platformFeeAmount?: number;
  netAmount?: number;
  refundedAmount?: number;
  refunds: ReceiptRefund[];
  paidAt?: string;
  issuer: { name: string; taxId?: string };
  customer: { id: string; name?: string; email?: string };
  land?: { id: string; title?: string };
}

interface ReceiptRefundInput {
  id: string;
  amount: number;
  reason?: string;
  stripeRefundId?: string;
  createdAt: string | Date;
}

interface ReceiptPayment {
  id: string;
  rentalRequestId: string;
  status: PaymentStatus;
  currency: "USD" | "PAB";
  amount: number;
  platformFeeAmount?: number;
  netAmount?: number;
  refundedAmount?: number;
  refunds?: ReceiptRefundInput[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

function toIso(value: string | Date | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

/** Número de recibo determinista a partir del id del pago. */
export function receiptNumberFor(paymentId: string): string {
  return `REC-${paymentId.replace(/^pay_/, "").replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

export function buildReceipt(input: {
  payment: ReceiptPayment;
  land?: { id: string; title?: string };
  customer?: { id: string; name?: string; email?: string };
  issuerName?: string;
}): Receipt {
  const { payment, land, customer } = input;
  const isPaid = payment.status === "paid" || payment.status === "partially_refunded";

  return {
    receiptNumber: receiptNumberFor(payment.id),
    issuedAt: new Date().toISOString(),
    paymentId: payment.id,
    rentalRequestId: payment.rentalRequestId,
    status: payment.status,
    currency: payment.currency,
    amount: payment.amount,
    platformFeeAmount: payment.platformFeeAmount,
    netAmount: payment.netAmount,
    refundedAmount: payment.refundedAmount,
    refunds: (payment.refunds ?? []).map((r) => ({
      id: r.id,
      amount: r.amount,
      reason: r.reason,
      stripeRefundId: r.stripeRefundId,
      createdAt: toIso(r.createdAt) ?? new Date().toISOString(),
    })),
    paidAt: isPaid ? toIso(payment.updatedAt) : undefined,
    issuer: { name: input.issuerName ?? "TerraShare" },
    customer: customer ?? { id: payment.rentalRequestId },
    land,
  };
}
