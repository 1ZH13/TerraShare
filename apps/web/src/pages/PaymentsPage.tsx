import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useUser } from "@clerk/clerk-react";
import type { PaymentDto } from "@terrashare/shared";
import { CreditCard } from "lucide-react";
import { getMyPayments, getReceipt } from "../services/api";
import { downloadReceipt } from "../lib/receipt";
import EmptyState from "../components/EmptyState";
import "./payments.css";

type PaymentRow = PaymentDto & { landTitle?: string; receiptUrl?: string };

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "pay-badge--pending" },
  processing: { label: "Procesando", cls: "pay-badge--neutral" },
  paid: { label: "Pagado", cls: "pay-badge--paid" },
  failed: { label: "Fallido", cls: "pay-badge--failed" },
  cancelled: { label: "Cancelado", cls: "pay-badge--neutral" },
  refunded: { label: "Reembolsado", cls: "pay-badge--neutral" },
  partially_refunded: { label: "Reembolso parcial", cls: "pay-badge--neutral" },
};

const RECEIPT_STATUSES = new Set(["paid", "refunded", "partially_refunded"]);

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PaymentsPage() {
  const { user } = useUser();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState<string | null>(null);

  const handleReceipt = async (paymentId: string) => {
    setReceiptLoading(paymentId);
    try {
      const receipt = await getReceipt(paymentId);
      if (receipt) downloadReceipt(receipt);
    } catch (err) {
      console.error("Error downloading receipt:", err);
    } finally {
      setReceiptLoading(null);
    }
  };

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const data = await getMyPayments();
        setPayments(data || []);
      } catch (err) {
        console.error("Error fetching payments:", err);
        setError(err instanceof Error ? err.message : "Error al cargar pagos");
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [user]);

  const stats = useMemo(() => {
    const thisYear = new Date().getFullYear();
    const paidYear = payments
      .filter((p) => p.status === "paid" && new Date(p.createdAt ?? 0).getFullYear() === thisYear)
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
    const pending = payments
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
    return { paidYear, pending, count: payments.length };
  }, [payments]);

  return (
    <div className="pay">
      <h1 className="pay-title">Pagos</h1>
      <p className="pay-sub">Historial de tus pagos de alquiler.</p>

      <div className="pay-stats">
        <div className="pay-stat">
          <div className="pay-stat__value">${stats.paidYear.toLocaleString("es-PA")}</div>
          <div className="pay-stat__label">Pagado este año</div>
        </div>
        <div className="pay-stat">
          <div className="pay-stat__value pay-stat__value--clay">
            ${stats.pending.toLocaleString("es-PA")}
          </div>
          <div className="pay-stat__label">Pendiente</div>
        </div>
        <div className="pay-stat">
          <div className="pay-stat__value">{stats.count}</div>
          <div className="pay-stat__label">Transacciones</div>
        </div>
      </div>

      {loading ? (
        <div className="pay-empty">Cargando pagos…</div>
      ) : error ? (
        <div className="pay-empty pay-empty--error">No pudimos cargar tus pagos.</div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Todavía no tienes pagos"
          description="Cuando completes el pago de un alquiler, aparecerá en tu historial."
          action={{ label: "Ver mis solicitudes", to: "/dashboard" }}
        />
      ) : (
        <div className="pay-table">
          <div className="pay-row pay-row--head">
            <span>Fecha</span>
            <span>Terreno</span>
            <span>Monto</span>
            <span>Estado</span>
            <span />
          </div>
          {payments.map((p) => {
            const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.pending;
            const isPending = p.status === "pending";
            return (
              <div key={p.id} className="pay-row">
                <span className="pay-cell--date">{isPending ? "Pendiente" : formatDate(p.createdAt)}</span>
                <span className="pay-cell--land">
                  {p.landTitle || `Solicitud #${p.rentalRequestId?.slice(0, 8) ?? "—"}`}
                </span>
                <span>${(p.amount ?? 0).toLocaleString("es-PA")}</span>
                <span>
                  <span className={`pay-badge ${badge.cls}`}>{badge.label}</span>
                </span>
                <span className="pay-cell--action">
                  {isPending ? (
                    <Link to="/pay/$requestId" params={{ requestId: p.rentalRequestId }} className="pay-action pay-action--pay">
                      Pagar
                    </Link>
                  ) : RECEIPT_STATUSES.has(p.status) ? (
                    <button
                      type="button"
                      className="pay-action"
                      onClick={() => handleReceipt(p.id)}
                      disabled={receiptLoading === p.id}
                    >
                      {receiptLoading === p.id ? "Generando…" : "Recibo"}
                    </button>
                  ) : (
                    <span />
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
