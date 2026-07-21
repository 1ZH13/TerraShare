import { Payment, RentalRequest, Contract, type PaymentStatus } from "../db/schemas";
import type { BusinessCurrency } from "./payments-money";

/**
 * Tipos del reporte de conciliación. Espejo local de los DTOs de
 * `@terrashare/shared` (el backend no depende del paquete compartido y mantiene
 * tipos paralelos, igual que con `PaymentStatus`/`AppRole`).
 */
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

export interface ReconciliationCurrencyTotalsDto {
  currency: BusinessCurrency;
  paidCount: number;
  grossAmount: number;
  platformFeeAmount: number;
  /** Suma devuelta a los arrendatarios; ya está descontada del `netAmount`. */
  refundedAmount: number;
  netAmount: number;
}

export interface ReconciliationReportDto {
  generatedAt: string;
  paymentsByStatus: Record<PaymentStatus, number>;
  totals: ReconciliationCurrencyTotalsDto[];
  discrepancies: ReconciliationDiscrepancyDto[];
  discrepancyCount: number;
}

/**
 * Conciliación de pagos (HU-41 #159): cruza pagos ↔ solicitudes ↔ contratos y
 * calcula totales (bruto/comisión/neto) por moneda, además de listar las
 * discrepancias detectadas. El núcleo (`reconcile`) es puro para poder
 * testearlo con datos en memoria; `buildReconciliationReport` es el envoltorio
 * que carga de Mongo.
 */

const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "partially_refunded",
  "refunded",
];

/**
 * Estados en los que el dinero **sí entró**. Un reembolso parcial sigue siendo
 * un cobro (se devolvió una parte, no el cobro entero), y uno total también
 * ocurrió aunque después se revirtiera: dejarlos fuera de los totales escondía
 * movimientos reales del informe, que es justo lo que una conciliación existe
 * para no perder. La devolución se resta aparte, en `refundedAmount`.
 */
const COLLECTED_STATUSES: PaymentStatus[] = ["paid", "partially_refunded", "refunded"];

/**
 * Estados en los que el cobro **sigue en pie** hoy. Un reembolso total deja la
 * solicitud sin cobro vigente, así que no cuenta aquí.
 */
const STILL_COLLECTED_STATUSES: PaymentStatus[] = ["paid", "partially_refunded"];

interface ReconPayment {
  id: string;
  rentalRequestId: string;
  status: PaymentStatus;
  amount: number;
  currency: BusinessCurrency;
  platformFeeAmount?: number;
  netAmount?: number;
  refundedAmount?: number;
}

interface ReconRequest {
  id: string;
  status: string;
}

interface ReconContract {
  rentalRequestId: string;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function reconcile(
  payments: ReconPayment[],
  requests: ReconRequest[],
  contracts: ReconContract[],
): ReconciliationReportDto {
  const requestById = new Map(requests.map((r) => [r.id, r]));
  const contractByRequest = new Set(contracts.map((c) => c.rentalRequestId));
  const paidPaymentRequestIds = new Set(
    payments
      .filter((p) => STILL_COLLECTED_STATUSES.includes(p.status))
      .map((p) => p.rentalRequestId),
  );

  const paymentsByStatus = Object.fromEntries(
    PAYMENT_STATUSES.map((s) => [s, 0]),
  ) as Record<PaymentStatus, number>;

  const totalsByCurrency = new Map<BusinessCurrency, ReconciliationCurrencyTotalsDto>();
  const discrepancies: ReconciliationDiscrepancyDto[] = [];

  for (const p of payments) {
    paymentsByStatus[p.status] = (paymentsByStatus[p.status] ?? 0) + 1;

    if (!COLLECTED_STATUSES.includes(p.status)) continue;

    const totals =
      totalsByCurrency.get(p.currency) ??
      ({
        currency: p.currency,
        paidCount: 0,
        grossAmount: 0,
        platformFeeAmount: 0,
        refundedAmount: 0,
        netAmount: 0,
      } satisfies ReconciliationCurrencyTotalsDto);
    const refunded = p.refundedAmount ?? 0;
    totals.paidCount += 1;
    totals.grossAmount = round2(totals.grossAmount + p.amount);
    totals.platformFeeAmount = round2(totals.platformFeeAmount + (p.platformFeeAmount ?? 0));
    totals.refundedAmount = round2(totals.refundedAmount + refunded);
    // El neto es lo que queda del cobro tras la comisión y las devoluciones.
    totals.netAmount = round2(totals.netAmount + (p.netAmount ?? p.amount) - refunded);
    totalsByCurrency.set(p.currency, totals);

    const request = requestById.get(p.rentalRequestId);
    if (!request) {
      discrepancies.push({
        type: "orphan_payment",
        paymentId: p.id,
        rentalRequestId: p.rentalRequestId,
        detail: `Pago pagado sin solicitud asociada (${p.rentalRequestId}).`,
      });
      continue;
    }

    if (request.status !== "paid") {
      discrepancies.push({
        type: "payment_paid_request_not_paid",
        paymentId: p.id,
        rentalRequestId: p.rentalRequestId,
        detail: `Pago pagado pero la solicitud está en estado "${request.status}".`,
      });
    }

    if (!contractByRequest.has(p.rentalRequestId)) {
      discrepancies.push({
        type: "payment_paid_without_contract",
        paymentId: p.id,
        rentalRequestId: p.rentalRequestId,
        detail: "Pago pagado sin contrato generado.",
      });
    }
  }

  for (const r of requests) {
    if (r.status === "paid" && !paidPaymentRequestIds.has(r.id)) {
      discrepancies.push({
        type: "request_paid_without_paid_payment",
        rentalRequestId: r.id,
        detail: "Solicitud pagada sin ningún pago confirmado.",
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    paymentsByStatus,
    totals: [...totalsByCurrency.values()],
    discrepancies,
    discrepancyCount: discrepancies.length,
  };
}

export async function buildReconciliationReport(): Promise<ReconciliationReportDto> {
  const [payments, requests, contracts] = await Promise.all([
    Payment.find().select("id rentalRequestId status amount currency platformFeeAmount netAmount refundedAmount").lean(),
    RentalRequest.find().select("id status").lean(),
    Contract.find().select("rentalRequestId").lean(),
  ]);

  return reconcile(
    payments as unknown as ReconPayment[],
    requests as unknown as ReconRequest[],
    contracts as unknown as ReconContract[],
  );
}
