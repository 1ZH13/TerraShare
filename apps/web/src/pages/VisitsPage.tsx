import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { CalendarClock, Check, X, RefreshCw } from "lucide-react";

import { listMyVisits, respondToVisit, type VisitDto, type VisitStatus } from "../services/api";

const statusConfig: Record<VisitStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pendiente", color: "#997a00", bg: "rgba(200, 170, 0, 0.15)" },
  confirmed: { label: "Confirmada", color: "var(--success, #059669)", bg: "rgba(11, 95, 55, 0.12)" },
  rescheduled: { label: "Reprogramada", color: "var(--river-500)", bg: "rgba(13, 111, 147, 0.12)" },
  rejected: { label: "Rechazada", color: "var(--danger, #dc2626)", bg: "rgba(180, 40, 40, 0.12)" },
};

/**
 * Visitas del usuario (HU-100 / #326). Muestra tanto las que solicité como las
 * de mis terrenos; en estas últimas puedo confirmar, reprogramar o rechazar.
 */
export default function VisitsPage() {
  const { user } = useUser();
  const [visits, setVisits] = useState<VisitDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setVisits(await listMyVisits());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las visitas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, load]);

  const respond = async (visit: VisitDto, status: Exclude<VisitStatus, "pending">) => {
    setBusyId(visit.id);
    setError("");
    try {
      let proposedDate: string | undefined;
      let proposedTime: string | undefined;

      if (status === "rescheduled") {
        const date = window.prompt("Nueva fecha (AAAA-MM-DD):", visit.proposedDate);
        if (!date) return;
        const time = window.prompt("Nueva hora (HH:MM):", visit.proposedTime);
        if (!time) return;
        proposedDate = date;
        proposedTime = time;
      }

      const updated = await respondToVisit(visit.id, { status, proposedDate, proposedTime });
      if (updated) {
        setVisits((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar la visita");
    } finally {
      setBusyId(null);
    }
  };

  const header = (
    <div className="section-header">
      <h1>Mis Visitas</h1>
      <p>Visitas que solicitaste y solicitudes sobre tus terrenos</p>
    </div>
  );

  if (loading) {
    return (
      <div>
        {header}
        <div className="glass-panel" style={{ marginTop: "1.5rem", textAlign: "center", padding: "3rem" }}>
          Cargando visitas...
        </div>
      </div>
    );
  }

  return (
    <div>
      {header}

      {error && (
        <div className="glass-panel" style={{ marginTop: "1rem", padding: "1rem", color: "var(--danger, #dc2626)" }}>
          {error}
        </div>
      )}

      {visits.length === 0 ? (
        <div className="glass-panel" style={{ marginTop: "1.5rem", textAlign: "center", padding: "3rem" }}>
          <CalendarClock size={32} style={{ opacity: 0.5 }} />
          <p style={{ marginTop: "0.75rem" }}>Todavía no tienes visitas.</p>
          <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>
            Puedes solicitar una desde la ficha de cualquier terreno.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: "1.5rem", display: "grid", gap: "1rem" }}>
          {visits.map((visit) => {
            const isOwner = user?.id === visit.ownerId;
            const cfg = statusConfig[visit.status];
            return (
              <div key={visit.id} className="glass-panel" style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      {visit.proposedDate} · {visit.proposedTime}
                    </p>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", opacity: 0.75 }}>
                      {isOwner ? "Solicitud sobre tu terreno" : "Visita que solicitaste"}
                    </p>
                    {visit.message && (
                      <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem" }}>«{visit.message}»</p>
                    )}
                    {visit.responseMessage && (
                      <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", opacity: 0.75 }}>
                        Respuesta: {visit.responseMessage}
                      </p>
                    )}
                  </div>
                  <span
                    style={{
                      alignSelf: "flex-start", padding: "0.25rem 0.75rem", borderRadius: "999px",
                      fontSize: "0.8rem", fontWeight: 600, color: cfg.color, background: cfg.bg,
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>

                {isOwner && visit.status === "pending" && (
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={busyId === visit.id}
                      onClick={() => respond(visit, "confirmed")}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.9rem", borderRadius: "8px", cursor: "pointer" }}
                    >
                      <Check size={15} /> Confirmar
                    </button>
                    <button
                      type="button"
                      disabled={busyId === visit.id}
                      onClick={() => respond(visit, "rescheduled")}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.9rem", borderRadius: "8px", cursor: "pointer" }}
                    >
                      <RefreshCw size={15} /> Reprogramar
                    </button>
                    <button
                      type="button"
                      disabled={busyId === visit.id}
                      onClick={() => respond(visit, "rejected")}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.9rem", borderRadius: "8px", cursor: "pointer" }}
                    >
                      <X size={15} /> Rechazar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
