import { useEffect, useMemo, useState } from "react";
import { getAdminSummary, listAdminRentalRequests } from "../services/adminApi";
import "./admin.css";

interface AdminSummary {
  users: { total: number };
  lands: { total: number };
  requests: { total: number; pendingOwner: number };
}

interface AdminRequest {
  id: string;
  landTitle?: string;
  tenantEmail?: string;
  status: string;
  intendedUse?: string;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: "Borrador", cls: "adm-badge--amber" },
  pending_owner: { label: "Pendiente", cls: "adm-badge--amber" },
  approved: { label: "Aprobada", cls: "adm-badge--green" },
  rejected: { label: "Rechazada", cls: "adm-badge--red" },
  pending_payment: { label: "Pago pendiente", cls: "adm-badge--amber" },
  paid: { label: "Pagada", cls: "adm-badge--green" },
  cancelled: { label: "Cancelada", cls: "adm-badge--red" },
};

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getAdminSummary(), listAdminRentalRequests({})])
      .then(([summaryRes, requestsRes]) => {
        if (!active) return;
        setSummary((summaryRes.data as AdminSummary) ?? null);
        setRequests((((requestsRes.data as unknown) as { items?: AdminRequest[] })?.items ?? []));
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : "Error"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Distribución por estado, calculada de las solicitudes cargadas.
  const dist = useMemo(() => {
    const approved = requests.filter((r) => r.status === "approved" || r.status === "paid").length;
    const pending = requests.filter((r) => r.status === "pending_owner" || r.status === "pending_payment").length;
    const rejected = requests.filter((r) => r.status === "rejected" || r.status === "cancelled").length;
    const max = Math.max(approved, pending, rejected, 1);
    return { approved, pending, rejected, max };
  }, [requests]);

  return (
    <>
      <h1 className="adm-title">Resumen de la plataforma</h1>
      <p className="adm-sub">Métricas clave de TerraShare.</p>

      <div className="adm-stats">
        <div className="adm-stat">
          <div className="adm-stat__value">{summary?.users.total ?? "—"}</div>
          <div className="adm-stat__label">Usuarios</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat__value">{summary?.lands.total ?? "—"}</div>
          <div className="adm-stat__label">Terrenos</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat__value">{summary?.requests.total ?? "—"}</div>
          <div className="adm-stat__label">Solicitudes</div>
        </div>
        <div className="adm-stat adm-stat--dark">
          <div className="adm-stat__value">{summary?.requests.pendingOwner ?? "—"}</div>
          <div className="adm-stat__label">Pendientes de aprobar</div>
        </div>
      </div>

      <div className="adm-row">
        <div className="adm-panel">
          <div className="adm-panel__title">Solicitudes recientes</div>
          {error ? (
            <div className="adm-empty adm-empty--error">No pudimos cargar las solicitudes.</div>
          ) : loading ? (
            <div className="adm-empty">Cargando…</div>
          ) : requests.length === 0 ? (
            <div className="adm-empty">No hay solicitudes para mostrar.</div>
          ) : (
            <div>
              <div className="adm-trow adm-trow--head" style={{ gridTemplateColumns: "1.4fr 1fr 0.9fr", padding: "10px 0" }}>
                <span>Terreno</span>
                <span>Arrendatario</span>
                <span>Estado</span>
              </div>
              {requests.slice(0, 6).map((r) => {
                const badge = STATUS_BADGE[r.status] ?? { label: r.status, cls: "adm-badge--amber" };
                return (
                  <div key={r.id} className="adm-trow" style={{ gridTemplateColumns: "1.4fr 1fr 0.9fr", padding: "12px 0" }}>
                    <span className="adm-cell--strong">{r.landTitle ?? "—"}</span>
                    <span className="adm-cell--muted adm-user__email">{r.tenantEmail ?? "—"}</span>
                    <span>
                      <span className={`adm-badge ${badge.cls}`}>{badge.label}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="adm-panel">
          <div className="adm-panel__title">Solicitudes por estado</div>
          <div className="adm-bars">
            <div>
              <div className="adm-bar__head">
                <span>Aprobadas</span>
                <span>{dist.approved}</span>
              </div>
              <div className="adm-bar__track">
                <div className="adm-bar__fill adm-bar__fill--green" style={{ width: `${(dist.approved / dist.max) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="adm-bar__head">
                <span>Pendientes</span>
                <span>{dist.pending}</span>
              </div>
              <div className="adm-bar__track">
                <div className="adm-bar__fill adm-bar__fill--amber" style={{ width: `${(dist.pending / dist.max) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="adm-bar__head">
                <span>Rechazadas</span>
                <span>{dist.rejected}</span>
              </div>
              <div className="adm-bar__track">
                <div className="adm-bar__fill adm-bar__fill--clay" style={{ width: `${(dist.rejected / dist.max) * 100}%` }} />
              </div>
            </div>
          </div>
          <div className="adm-panel__foot">
            Total de solicitudes
            <div className="adm-panel__foot-value">{summary?.requests.total ?? requests.length}</div>
          </div>
        </div>
      </div>
    </>
  );
}
