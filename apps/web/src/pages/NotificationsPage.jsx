import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

const typeLabels = {
  rental_request_status: "Solicitud",
  payment: "Pago",
  message: "Mensaje",
  land_available: "Terreno",
  system: "Sistema",
};

export default function NotificationsPage() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !user.getToken) {
        setLoading(false);
        return;
      }
      try {
        const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
        const token = await user.getToken();
        const res = await fetch(`${BASE_URL}/api/v1/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setNotifications(data?.data || []);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setError(err.message);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div>
        <div className="section-header">
          <h1>Notificaciones</h1>
          <p>Actualizaciones y alertas</p>
        </div>
        <div className="glass-panel" style={{ marginTop: "1.5rem", textAlign: "center", padding: "3rem" }}>
          <p>Cargando notificaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h1>Notificaciones</h1>
        <p>Actualizaciones y alertas</p>
      </div>

      {error && (
        <div className="glass-panel" style={{ marginTop: "1.5rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <p style={{ color: "var(--danger)" }}>Error: {error}</p>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="glass-panel" style={{ marginTop: "1.5rem" }}>
          <p>No tienes notificaciones.</p>
          <p style={{ opacity: 0.7, marginTop: "0.5rem" }}>Recibiras alertas sobre tus solicitudes, pagos y mensajes.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.5rem" }}>
          {notifications.map((n) => (
            <div key={n.id} className="glass-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span className="card-badge" style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem" }}>
                      {typeLabels[n.type] || n.type}
                    </span>
                    {!n.read && (
                      <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: "var(--leaf-700)" }} />
                    )}
                  </div>
                  <p style={{ margin: "0 0 0.25rem", fontWeight: n.read ? 400 : 700 }}>{n.title}</p>
                  <p style={{ margin: 0, opacity: 0.7, fontSize: "0.9rem" }}>{n.message}</p>
                  {n.actionUrl && (
                    <Link to={n.actionUrl} className="btn btn-ghost" style={{ marginTop: "0.75rem", fontSize: "0.85rem", padding: "0.5rem 0.75rem" }}>
                      Ver detalles
                    </Link>
                  )}
                </div>
                <span style={{ fontSize: "0.75rem", opacity: 0.5, whiteSpace: "nowrap" }}>
                  {n.createdAt ? new Date(n.createdAt).toLocaleDateString("es-PA") : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}