import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

const statusLabels = {
  pending: "Pendiente",
  completed: "Completado",
  failed: "Fallido",
  refunded: "Reembolsado",
};

const statusStyles = {
  pending: { bg: "rgba(13, 111, 147, 0.15)", color: "var(--river-500)" },
  completed: { bg: "rgba(11, 95, 55, 0.15)", color: "var(--leaf-700)" },
  failed: { bg: "rgba(179, 52, 42, 0.15)", color: "var(--danger)" },
  refunded: { bg: "rgba(157, 106, 59, 0.15)", color: "var(--soil-500)" },
};

export default function PaymentsPage() {
  const { user } = useUser();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user || !user.getToken) {
        setLoading(false);
        return;
      }
      try {
        const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
        const token = await user.getToken();
        const res = await fetch(`${BASE_URL}/api/v1/payments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setPayments(data?.data || []);
      } catch (err) {
        console.error("Error fetching payments:", err);
        setError(err.message);
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [user]);

  const filteredPayments = filter === "all" ? payments : payments.filter((p) => p.status === filter);

  if (loading) {
    return (
      <div>
        <div className="section-header">
          <h1>Mis Pagos</h1>
          <p>Historial de transacciones</p>
        </div>
        <div className="glass-panel" style={{ marginTop: "1.5rem", textAlign: "center", padding: "3rem" }}>
          <p>Cargando pagos...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h1>Mis Pagos</h1>
        <p>Historial de transacciones</p>
      </div>

      <div className="glass-panel" style={{ marginTop: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {["all", "pending", "completed", "failed"].map((f) => (
            <button
              key={f}
              className={`filter-chip ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Todos" : statusLabels[f] || f}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{ marginTop: "1rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <p style={{ color: "var(--danger)" }}>Error: {error}</p>
        </div>
      )}

      {filteredPayments.length === 0 ? (
        <div className="glass-panel" style={{ marginTop: "1rem" }}>
          <p>No tienes pagos{filter !== "all" ? ` ${filter === "pending" ? "pendientes" : filter === "completed" ? "completados" : "fallidos"}` : ""}.</p>
          <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: "1rem" }}>
            Ver mis solicitudes
          </Link>
        </div>
      ) : (
        <div className="glass-panel" style={{ marginTop: "1rem" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Terreno</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Referencia</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => {
                const styles = statusStyles[payment.status] || statusStyles.pending;
                return (
                  <tr key={payment.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString("es-PA") : "—"}
                    </td>
                    <td>{payment.landTitle || payment.rentalRequestId?.slice(0, 8)}</td>
                    <td style={{ fontWeight: 700 }}>
                      ${payment.amount} {payment.currency || "USD"}
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "999px",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          background: styles.bg,
                          color: styles.color,
                        }}
                      >
                        {statusLabels[payment.status] || payment.status}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.75rem", opacity: 0.6 }}>{payment.id}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}