import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";
import type { ReconciliationReportDto } from "@terrashare/shared";
import { getReconciliation } from "../services/adminApi";
import "./admin.css";

const DISCREPANCY_LABELS: Record<string, string> = {
  payment_paid_request_not_paid: "Pago cobrado, solicitud no pagada",
  payment_paid_without_contract: "Pago cobrado sin contrato",
  request_paid_without_paid_payment: "Solicitud pagada sin pago",
  orphan_payment: "Pago huérfano",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendientes",
  processing: "Procesando",
  paid: "Pagados",
  failed: "Fallidos",
  cancelled: "Cancelados",
  partially_refunded: "Reembolso parcial",
  refunded: "Reembolsados",
};

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function AdminReconciliationPage() {
  const [report, setReport] = useState<ReconciliationReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    getReconciliation()
      .then((res) => setReport(res.data))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const totalPaid = report?.totals.reduce((acc, t) => acc + t.paidCount, 0) ?? 0;
  const discrepancyCount = report?.discrepancyCount ?? 0;
  const hasDiscrepancies = discrepancyCount > 0;

  return (
    <>
      <div className="adm-toolbar" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="adm-title">Conciliación de pagos</h1>
          <p className="adm-sub">Cruce entre pagos, solicitudes y contratos, con totales por moneda.</p>
        </div>
        <button type="button" className="adm-pill adm-pill--cta" onClick={load} disabled={loading}>
          <RefreshCw size={15} /> {loading ? "Cargando…" : "Actualizar"}
        </button>
      </div>

      {error ? (
        <div className="adm-empty adm-empty--error">No pudimos cargar la conciliación.</div>
      ) : loading && !report ? (
        <div className="adm-empty">Cargando…</div>
      ) : report ? (
        <>
          <div className="adm-stats">
            <div className={`adm-stat ${hasDiscrepancies ? "adm-stat--dark" : ""}`}>
              <div className="adm-stat__value">{discrepancyCount}</div>
              <div className="adm-stat__label">Discrepancias</div>
            </div>
            <div className="adm-stat">
              <div className="adm-stat__value">{totalPaid}</div>
              <div className="adm-stat__label">Pagos cobrados</div>
            </div>
            {report.totals.map((t) => (
              <div className="adm-stat" key={`stat-${t.currency}`}>
                <div className="adm-stat__value">{formatMoney(t.netAmount, t.currency)}</div>
                <div className="adm-stat__label">Neto {t.currency}</div>
              </div>
            ))}
          </div>

          <h2 className="adm-title" style={{ fontSize: 20, marginTop: 8 }}>Totales por moneda</h2>
          <div className="adm-table" style={{ marginBottom: 26 }}>
            <div className="adm-trow adm-trow--head" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr" }}>
              <span>Moneda</span>
              <span>Pagos</span>
              <span>Bruto</span>
              <span>Comisión</span>
              <span>Reembolsado</span>
              <span>Neto</span>
            </div>
            {report.totals.length === 0 ? (
              <div className="adm-empty">Aún no hay pagos cobrados.</div>
            ) : (
              report.totals.map((t) => (
                <div key={t.currency} className="adm-trow" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr" }}>
                  <span className="adm-cell--strong">{t.currency}</span>
                  <span>{t.paidCount}</span>
                  <span>{formatMoney(t.grossAmount, t.currency)}</span>
                  <span className="adm-cell--muted">{formatMoney(t.platformFeeAmount, t.currency)}</span>
                  <span className="adm-cell--muted">{formatMoney(t.refundedAmount ?? 0, t.currency)}</span>
                  <span className="adm-cell--strong">{formatMoney(t.netAmount, t.currency)}</span>
                </div>
              ))
            )}
          </div>

          <h2 className="adm-title" style={{ fontSize: 20 }}>
            Discrepancias{" "}
            {hasDiscrepancies ? (
              <AlertTriangle size={18} style={{ verticalAlign: "-3px", color: "var(--danger, #b4462f)" }} />
            ) : (
              <CheckCircle2 size={18} style={{ verticalAlign: "-3px", color: "var(--ts-green, #3f6b4c)" }} />
            )}
          </h2>
          <div className="adm-table">
            <div className="adm-trow adm-trow--head" style={{ gridTemplateColumns: "1.4fr 2.6fr 1.4fr" }}>
              <span>Tipo</span>
              <span>Detalle</span>
              <span>Referencia</span>
            </div>
            {!hasDiscrepancies ? (
              <div className="adm-empty">Todo cuadra: sin discrepancias.</div>
            ) : (
              report.discrepancies.map((d, i) => (
                <div key={`${d.type}-${i}`} className="adm-trow" style={{ gridTemplateColumns: "1.4fr 2.6fr 1.4fr" }}>
                  <span>
                    <span className="adm-badge adm-badge--teal">{DISCREPANCY_LABELS[d.type] ?? d.type}</span>
                  </span>
                  <span className="adm-cell--muted">{d.detail}</span>
                  <span className="adm-cell--muted" style={{ fontSize: 12 }}>
                    {d.paymentId ?? d.rentalRequestId ?? "—"}
                  </span>
                </div>
              ))
            )}
          </div>

          {report.paymentsByStatus && (
            <p className="adm-sub" style={{ marginTop: 18 }}>
              {Object.entries(report.paymentsByStatus)
                .map(([status, count]) => `${STATUS_LABELS[status] ?? status}: ${count}`)
                .join(" · ")}
            </p>
          )}
        </>
      ) : null}
    </>
  );
}
