import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { PaymentDto } from "@terrashare/shared";
import { listAdminPayments, refundPayment } from "../services/adminApi";
import "./admin.css";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  paid: "Pagado",
  failed: "Fallido",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  partially_refunded: "Reembolso parcial",
};

const REFUNDABLE = new Set(["paid", "partially_refunded"]);

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-PA", { style: "currency", currency }).format(amount);
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeRefund, setActiveRefund] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    listAdminPayments()
      .then((res) => setPayments(res.data ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openRefund = (id: string) => {
    setActiveRefund(id);
    setAmount("");
    setReason("");
    setFormError("");
  };

  const submitRefund = async (payment: PaymentDto) => {
    setSubmitting(true);
    setFormError("");
    try {
      const parsed = amount.trim() ? Number(amount) : undefined;
      if (parsed !== undefined && (Number.isNaN(parsed) || parsed <= 0)) {
        setFormError("Importe inválido");
        setSubmitting(false);
        return;
      }
      await refundPayment(payment.id, { amount: parsed, reason: reason.trim() || undefined });
      setActiveRefund(null);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "No se pudo reembolsar");
    } finally {
      setSubmitting(false);
    }
  };

  const cols = "1.6fr 1fr 1fr 1.2fr 1fr";

  return (
    <>
      <div className="adm-toolbar" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="adm-title">Pagos y reembolsos</h1>
          <p className="adm-sub">Gestiona los pagos y emite reembolsos totales o parciales.</p>
        </div>
      </div>

      <div className="adm-table">
        <div className="adm-trow adm-trow--head" style={{ gridTemplateColumns: cols }}>
          <span>Pago</span>
          <span>Monto</span>
          <span>Reembolsado</span>
          <span>Estado</span>
          <span />
        </div>

        {loading ? (
          <div className="adm-empty">Cargando…</div>
        ) : error ? (
          <div className="adm-empty adm-empty--error">No pudimos cargar los pagos.</div>
        ) : payments.length === 0 ? (
          <div className="adm-empty">No hay pagos.</div>
        ) : (
          payments.map((p) => (
            <div key={p.id}>
              <div className="adm-trow" style={{ gridTemplateColumns: cols }}>
                <span className="adm-cell--strong" style={{ fontSize: 13 }}>{p.id.slice(0, 16)}…</span>
                <span>{money(p.amount, p.currency)}</span>
                <span className="adm-cell--muted">
                  {p.refundedAmount ? money(p.refundedAmount, p.currency) : "—"}
                </span>
                <span>
                  <span className="adm-badge adm-badge--teal">{STATUS_LABELS[p.status] ?? p.status}</span>
                </span>
                <span style={{ textAlign: "right" }}>
                  {REFUNDABLE.has(p.status) && (
                    <button
                      type="button"
                      className="adm-pill"
                      onClick={() => (activeRefund === p.id ? setActiveRefund(null) : openRefund(p.id))}
                    >
                      <RotateCcw size={14} /> Reembolsar
                    </button>
                  )}
                </span>
              </div>

              {activeRefund === p.id && (
                <div className="adm-trow" style={{ gridTemplateColumns: "1fr", gap: 10, background: "rgba(0,0,0,0.02)" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={`Total (${money(p.amount - (p.refundedAmount ?? 0), p.currency)})`}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d5ddd6", maxWidth: 200 }}
                    />
                    <input
                      type="text"
                      placeholder="Motivo (opcional)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d5ddd6", flex: 1, minWidth: 180 }}
                    />
                    <button
                      type="button"
                      className="adm-pill adm-pill--cta"
                      onClick={() => submitRefund(p)}
                      disabled={submitting}
                    >
                      {submitting ? "Procesando…" : "Confirmar reembolso"}
                    </button>
                  </div>
                  {formError && <span className="adm-empty--error" style={{ fontSize: 13 }}>{formError}</span>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
