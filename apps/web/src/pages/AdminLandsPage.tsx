import { useState, useEffect } from "react";
import type { LandDto } from "@terrashare/shared";
import { listAdminLands, updateLandStatus } from "../services/adminApi";

// Admin view: status is broader than LandStatus (includes "rejected") and the
// summary adds ownerEmail.
type AdminLand = Omit<LandDto, "status"> & { status: string; ownerEmail?: string };

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  active: "Activo",
  inactive: "Inactivo",
  rejected: "Rechazado",
};

export default function AdminLandsPage() {
  const [lands, setLands] = useState<AdminLand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const loadLands = () => {
    setLoading(true);
    setError("");
    const filters: { status?: string; search?: string } = {};
    if (filter !== "all") filters.status = filter;
    if (search.trim()) filters.search = search.trim();

    listAdminLands(filters)
      .then((res) => setLands(((res.data as any)?.items ?? []) as AdminLand[]))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLands();
  }, [filter, search]);

  const handleUpdateStatus = async (landId: string, _currentStatus: string, nextStatus: string) => {
    try {
      await updateLandStatus(landId, nextStatus);
      setLands((prev) => prev.map((l) => (l.id === landId ? { ...l, status: nextStatus } : l)));
      setActionMsg(`Terreno ${nextStatus === "active" ? "aprobado" : nextStatus === "rejected" ? "rechazado" : "desactivado"}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setTimeout(() => setActionMsg(""), 3000);
  };

  return (
    <div className="admin-page-header">
      <h1>Moderación de Terrenos</h1>
      <p>Revisa y aprueba los terrenos publicados en la plataforma</p>

      <div className="admin-filters-bar">
        <input
          type="text"
          placeholder="Buscar por título o provincia..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-search-input"
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="admin-select">
          <option value="all">Todos</option>
          <option value="draft">Borrador (pendiente)</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="rejected">Rechazados</option>
        </select>
        <span className="admin-count">{lands.length} terreno{lands.length !== 1 ? "s" : ""}</span>
        {actionMsg && <span className="admin-action-msg">{actionMsg}</span>}
      </div>

      {loading && <div className="admin-loading">Cargando...</div>}
      {error && <div className="admin-error">{error}</div>}

      {!loading && !error && (
        <div className="admin-lands-list">
          {lands.length === 0 ? (
            <div className="admin-empty">No se encontraron terrenos</div>
          ) : (
            lands.map((land) => (
              <div key={land.id} className="admin-data-card">
                <div className="admin-data-card-info">
                  <h3>{land.title}</h3>
                  <p className="land-owner">Propietario: {land.ownerEmail}</p>
                </div>
                <span className={`admin-status-badge ${land.status}`}>
                  {statusLabels[land.status] ?? land.status}
                </span>
                {land.status === "draft" && (
                  <>
                    <button
                      className="admin-btn admin-btn-primary"
                      onClick={() => handleUpdateStatus(land.id, land.status, "active")}
                    >
                      Aprobar
                    </button>
                    <button
                      className="admin-btn admin-btn-ghost"
                      onClick={() => handleUpdateStatus(land.id, land.status, "rejected")}
                    >
                      Rechazar
                    </button>
                  </>
                )}
                {land.status === "active" && (
                  <button
                    className="admin-btn admin-btn-ghost"
                    onClick={() => handleUpdateStatus(land.id, land.status, "inactive")}
                  >
                    Desactivar
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}