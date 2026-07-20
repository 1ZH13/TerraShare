import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, Check, X, Eye } from "lucide-react";
import type { VisitDto } from "@terrashare/shared";
import { getVisits, updateVisitStatus } from "../../services/api";
import EmptyState from "../../components/EmptyState";
import { useUser } from "@clerk/clerk-react";

export default function VisitsPage() {
  const { user } = useUser();
  const [visits, setVisits] = useState<{ asVisitor: VisitDto[], asOwner: VisitDto[] }>({ asVisitor: [], asOwner: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getVisits()
      .then((data) => {
        if (active) {
          setVisits(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error cargando visitas:", err);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleUpdateStatus = async (id: string, status: "accepted" | "rejected" | "completed" | "cancelled") => {
    try {
      await updateVisitStatus(id, { status });
      // Actualizar localmente
      const updateList = (list: VisitDto[]) =>
        list.map((v) => (v.id === id ? { ...v, status } : v));
      setVisits((prev) => ({
        asVisitor: updateList(prev.asVisitor),
        asOwner: updateList(prev.asOwner),
      }));
    } catch (err) {
      console.error(err);
      alert("Error actualizando la visita");
    }
  };

  const renderVisitCard = (visit: VisitDto, asOwner: boolean) => (
    <div key={visit.id} className="glass-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
      <div>
        <h3 style={{ margin: "0 0 0.5rem 0" }}>Terreno ID: {visit.landId}</h3>
        <div style={{ fontSize: "0.9rem", color: "var(--text-200)", display: "flex", gap: "1rem" }}>
          <span><strong>Fecha:</strong> {new Date(visit.date).toLocaleString("es-PA")}</span>
          <span><strong>Estado:</strong> {visit.status.toUpperCase()}</span>
          <span><strong>{asOwner ? "Visitante" : "Propietario"}:</strong> {asOwner ? visit.visitorId : visit.ownerId}</span>
        </div>
        {visit.notes && <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}><strong>Notas:</strong> {visit.notes}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Link to="/lands/$id" params={{ id: visit.landId }} className="btn btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
          <Eye size={16} /> Ver terreno
        </Link>
        {visit.status === "pending" && asOwner && (
          <>
            <button onClick={() => handleUpdateStatus(visit.id, "accepted")} className="btn btn-primary" style={{ background: "var(--success)" }}>
              <Check size={16} /> Aceptar
            </button>
            <button onClick={() => handleUpdateStatus(visit.id, "rejected")} className="btn btn-outline" style={{ color: "var(--danger)" }}>
              <X size={16} /> Rechazar
            </button>
          </>
        )}
        {visit.status === "pending" && !asOwner && (
          <button onClick={() => handleUpdateStatus(visit.id, "cancelled")} className="btn btn-outline" style={{ color: "var(--danger)" }}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return <div style={{ padding: "2rem" }}>Cargando visitas...</div>;
  }

  const hasVisits = visits.asVisitor.length > 0 || visits.asOwner.length > 0;

  return (
    <div>
      <div className="section-header">
        <h1>Visitas Programadas</h1>
        <p>Gestiona tus visitas a terrenos de otros y las solicitudes a los tuyos.</p>
      </div>

      {!hasVisits ? (
        <EmptyState
          icon={Calendar}
          title="Sin visitas"
          description="No tienes visitas programadas ni solicitudes."
          action={{
            label: "Explorar terrenos",
            onClick: () => (window.location.href = "/catalog"),
          }}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {visits.asOwner.length > 0 && (
            <div>
              <h2 style={{ marginBottom: "1rem" }}>Solicitudes a mis terrenos</h2>
              {visits.asOwner.map((v) => renderVisitCard(v, true))}
            </div>
          )}
          {visits.asVisitor.length > 0 && (
            <div>
              <h2 style={{ marginBottom: "1rem" }}>Mis visitas agendadas</h2>
              {visits.asVisitor.map((v) => renderVisitCard(v, false))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
