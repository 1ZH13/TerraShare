import { useEffect, useState } from "react";
import { listAuditEvents, type AuditEventDto } from "../services/adminApi";
import "./admin.css";

const ENTITY_LABELS: Record<string, string> = {
  auth: "Autenticación",
  user: "Usuario",
  land: "Terreno",
  rental_request: "Solicitud",
  contract: "Contrato",
  payment: "Pago",
  chat: "Chat",
};

const ACTION_LABELS: Record<string, string> = {
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

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  user: "Usuario",
  system: "Sistema",
};

/** El sistema no es una persona: se distingue en gris para no leerse como cuenta. */
const ROLE_BADGE: Record<string, string> = {
  admin: "adm-badge--teal",
  user: "adm-badge--green",
  system: "adm-badge--muted",
};

const PAGE_SIZE = 20;
const COLUMNS = "1.1fr 0.7fr 0.9fr 1fr 1.1fr";

export default function AdminAuditPage() {
  const [events, setEvents] = useState<AuditEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError("");
    listAuditEvents()
      .then((list) => {
        setEvents(list);
        setPage(1);
      })
      // Un 401/403 traía `data` vacío y la pantalla mentía con «no hay eventos»;
      // el cliente de admin ya distingue el error de permisos (#262).
      .catch((e) => {
        setEvents([]);
        setError(e instanceof Error ? e.message : "No pudimos cargar los eventos de auditoría.");
      })
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const pageEvents = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <h1 className="adm-title">Bitácora de auditoría</h1>
      <p className="adm-sub">Registro de las acciones realizadas en la plataforma.</p>

      <div className="adm-table">
        <div className="adm-trow adm-trow--head" style={{ gridTemplateColumns: COLUMNS }}>
          <span>Fecha</span>
          <span>Actor</span>
          <span>Entidad</span>
          <span>Acción</span>
          <span>Identificador</span>
        </div>

        {loading ? (
          <div className="adm-empty">Cargando…</div>
        ) : error ? (
          <div className="adm-empty adm-empty--error">{error}</div>
        ) : events.length === 0 ? (
          <div className="adm-empty">Todavía no hay eventos de auditoría.</div>
        ) : (
          pageEvents.map((e) => (
            <div key={e.id} className="adm-trow" style={{ gridTemplateColumns: COLUMNS }}>
              <span className="adm-cell--muted">
                {new Date(e.createdAt).toLocaleString("es-PA", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
              <span>
                <span className={`adm-badge ${ROLE_BADGE[e.actorRole] ?? "adm-badge--green"}`}>
                  {ROLE_LABELS[e.actorRole] ?? e.actorRole}
                </span>
              </span>
              <span>{ENTITY_LABELS[e.entity] ?? e.entity}</span>
              <span className="adm-cell--strong">{ACTION_LABELS[e.action] ?? e.action}</span>
              {/* Sin recortar: un id a medias no sirve para buscar el registro. */}
              <span className="adm-code" title={e.entityId}>
                {e.entityId}
              </span>
            </div>
          ))
        )}
      </div>

      {!loading && !error && events.length > 0 && (
        <div className="adm-foot">
          <span>
            {events.length} evento{events.length !== 1 ? "s" : ""}
            {totalPages > 1 ? ` · página ${page} de ${totalPages}` : ""}
          </span>
          {totalPages > 1 && (
            <div className="adm-pager">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
