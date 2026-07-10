import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

interface AuditEventItem {
  id: string;
  actorId: string;
  actorRole: string;
  entity: string;
  action: string;
  entityId: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

const entityLabels: Record<string, string> = {
  auth: "Autenticación",
  user: "Usuario",
  land: "Terreno",
  rental_request: "Solicitud",
  contract: "Contrato",
  payment: "Pago",
  chat: "Chat",
};

const actionLabels: Record<string, string> = {
  created: "Creado",
  updated: "Actualizado",
  deleted: "Eliminado",
  approved: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
  paid: "Pagado",
  refunded: "Reembolsado",
  status_changed: "Estado cambiado",
};

export default function AdminAuditPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const fetchData = async () => {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const token = await getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
        else if (import.meta.env.DEV) { headers["x-dev-role"] = "admin"; headers["x-dev-user-id"] = "web_dev_admin"; }
        const res = await fetch(`${BASE_URL}/api/v1/audit-events`, { headers });
        const json = await res.json();
        // El endpoint de main devuelve un array plano en `data`; toleramos también
        // una eventual forma paginada { items } por si el backend cambia más adelante.
        const list: AuditEventItem[] = Array.isArray(json?.data)
          ? json.data
          : json?.data?.items || [];
        setEvents(list);
        setPage(1);
      } catch {
        setError("Error loading audit events");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const pageEvents = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="section-header">
        <h1>Bitácora de Auditoría</h1>
        <p>Registro de acciones realizadas en la plataforma</p>
      </div>

      {loading && <div style={{ marginTop: "1.5rem", textAlign: "center", opacity: 0.6 }}>Cargando...</div>}
      {error && <div style={{ marginTop: "1.5rem", color: "var(--danger)" }}>{error}</div>}

      {!loading && !error && (
        <div className="glass-panel" style={{ marginTop: "1.5rem" }}>
          {events.length === 0 ? (
            <p style={{ textAlign: "center", opacity: 0.6, padding: "2rem" }}>No hay eventos de auditoría</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Actor</th>
                    <th>Entidad</th>
                    <th>Acción</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {pageEvents.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontSize: "0.8rem" }}>{new Date(e.createdAt).toLocaleString()}</td>
                      <td><span className={`role-badge role-${e.actorRole}`}>{e.actorRole}</span></td>
                      <td>{entityLabels[e.entity] || e.entity}</td>
                      <td>{actionLabels[e.action] || e.action}</td>
                      <td style={{ fontSize: "0.75rem", opacity: 0.6 }}>{e.entityId.slice(0, 12)}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1rem" }}>
              <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </button>
              <span style={{ padding: "0.5rem 1rem", opacity: 0.6 }}>
                {page} / {totalPages}
              </span>
              <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
