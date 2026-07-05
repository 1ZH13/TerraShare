import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import type { PaymentDto } from "@terrashare/shared";
import { getMyPayments } from "../services/api";
import "./payments.css";

type PaymentRow = PaymentDto & { landTitle?: string; receiptUrl?: string };

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "pay-badge--pending" },
  processing: { label: "Procesando", cls: "pay-badge--neutral" },
  paid: { label: "Pagado", cls: "pay-badge--paid" },
  failed: { label: "Fallido", cls: "pay-badge--failed" },
  cancelled: { label: "Cancelado", cls: "pay-badge--neutral" },
};

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
        <div className="pay-empty">
          <p>Todavía no tienes pagos.</p>
          <Link to="/dashboard" className="pay-empty__cta">
            Ver mis solicitudes
          </Link>
        </div>
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
                    <Link to="/dashboard" className="pay-action pay-action--pay">
                      Pagar
                    </Link>
                  ) : p.receiptUrl ? (
                    <a href={p.receiptUrl} className="pay-action" target="_blank" rel="noreferrer">
                      Recibo
                    </a>
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
