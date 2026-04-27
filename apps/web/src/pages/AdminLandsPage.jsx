import { useState, useEffect } from "react";
import { listAdminLands, updateLandStatus } from "../services/adminApi";

const statusLabels = {
  draft: "Borrador",
  active: "Activo",
  inactive: "Inactivo",
  rejected: "Rechazado",
};

const statusColors = {
  draft: { bg: "rgba(200, 170, 0, 0.15)", color: "var(--accent-600)" },
  active: { bg: "rgba(11, 95, 55, 0.15)", color: "var(--leaf-700)" },
  inactive: { bg: "rgba(100, 100, 100, 0.15)", color: "var(--stone-600)" },
  rejected: { bg: "rgba(180, 40, 40, 0.15)", color: "var(--error)" },
};

export default function AdminLandsPage() {
  const [lands, setLands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("draft");
  const [search, setSearch] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const loadLands = () => {
    setLoading(true);
    setError("");
    const filters = {};
    if (filter !== "all") filters.status = filter;
    if (search.trim()) filters.search = search.trim();

    listAdminLands(filters)
      .then((res) => setLands(res.data?.items ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLands();
  }, [filter, search]);

  const handleUpdateStatus = async (landId, currentStatus, nextStatus) => {
    try {
      await updateLandStatus(landId, nextStatus);
      setLands((prev) => prev.map((l) => l.id === landId ? { ...l, status: nextStatus } : l));
      setActionMsg(`Terreno ${nextStatus === "active" ? "aprobado" : "rechazado"}`);
    } catch (e) {
      setError(e.message);
    }
    setTimeout(() => setActionMsg(""), 3000);
  };

  return (
    <div>
      <div className="section-header">
        <h1>Moderación de Terrenos</h1>
        <p>Revisa y aprueba los terrenos publicados en la plataforma</p>
      </div>

      <div className="filters-bar" style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Buscar por título o provincia..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "300px", flex: 1 }}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Todos</option>
          <option value="draft">Borrador (pendiente)</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="rejected">Rechazados</option>
        </select>
        <span style={{ opacity: 0.7 }}>{lands.length} terreno{lands.length !== 1 ? "s" : ""}</span>
        {actionMsg && (
          <span style={{ color: "var(--leaf-600)", fontWeight: 600 }}>{actionMsg}</span>
        )}
      </div>

      {loading && <p className="muted" style={{ marginTop: "1rem" }}>Cargando...</p>}
      {error && <p className="error-text" style={{ marginTop: "1rem" }}>{error}</p>}

      {!loading && !error && (
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {lands.map((land) => {
            const colors = statusColors[land.status] ?? statusColors.draft;
            return (
              <div key={land.id} className="panel" style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0 }}>{land.title}</h3>
                  <p style={{ margin: "0.25rem 0 0", opacity: 0.7, fontSize: "0.875rem" }}>
                    Propietario: {land.ownerEmail}
                  </p>
                  <p style={{ margin: "0.25rem 0 0", opacity: 0.5, fontSize: "0.75rem" }}>
                    ID: {land.id}
                  </p>
                </div>
                <span style={{
                  display: "inline-block", padding: "0.25rem 0.75rem",
                  borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700,
                  background: colors.bg, color: colors.color,
                }}>
                  {statusLabels[land.status] ?? land.status}
                </span>
                {land.status === "draft" && (
                  <>
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}
                      onClick={() => handleUpdateStatus(land.id, land.status, "active")}
                    >
                      Aprobar
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}
                      onClick={() => handleUpdateStatus(land.id, land.status, "rejected")}
                    >
                      Rechazar
                    </button>
                  </>
                )}
                {land.status === "active" && (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}
                    onClick={() => handleUpdateStatus(land.id, land.status, "inactive")}
                  >
                    Desactivar
                  </button>
                )}
              </div>
            );
          })}
          {lands.length === 0 && (
            <div className="panel" style={{ textAlign: "center", opacity: 0.5, padding: "2rem" }}>
              No se encontraron terrenos
            </div>
          )}
        </div>
      )}
    </div>
  );
}
