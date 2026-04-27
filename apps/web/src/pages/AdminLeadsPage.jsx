import { useState, useEffect } from "react";
import { listAdminLeads, setTokenFn } from "../services/adminApi";
import { useClerkToken } from "../hooks/useClerkToken";

const sourceLabels = {
  landing: "Landing Page",
  "app-web": "App Web",
  "admin-dashboard": "Admin Dashboard",
};

const sourceColors = {
  landing: { bg: "rgba(13, 111, 147, 0.15)", color: "var(--river-500)" },
  "app-web": { bg: "rgba(11, 95, 55, 0.15)", color: "var(--leaf-700)" },
  "admin-dashboard": { bg: "rgba(200, 170, 0, 0.15)", color: "var(--accent-600)" },
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const tokenReady = useClerkToken(setTokenFn);

  const loadLeads = () => {
    setLoading(true);
    setError("");
    const filters = {};
    if (filter !== "all") filters.source = filter;
    if (search.trim()) filters.search = search.trim();

    listAdminLeads(filters)
      .then((res) => setLeads(res.data?.leads ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tokenReady) {
      loadLeads();
    }
  }, [tokenReady, filter, search]);

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString("es-PA", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      <div className="section-header">
        <h1>Leads</h1>
        <p>Contactos capturados desde landing page y formularios</p>
      </div>

      <div className="filters-bar" style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Buscar por email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "300px", flex: 1 }}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Todos</option>
          <option value="landing">Landing Page</option>
          <option value="app-web">App Web</option>
          <option value="admin-dashboard">Admin Dashboard</option>
        </select>
        <span style={{ opacity: 0.7 }}>{leads.length} lead{leads.length !== 1 ? "s" : ""}</span>
      </div>

      {loading && <p className="muted" style={{ marginTop: "1rem" }}>Cargando...</p>}
      {error && <p className="error-text" style={{ marginTop: "1rem" }}>{error}</p>}

      {!loading && !error && (
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {leads.map((lead) => {
            const colors = sourceColors[lead.source] ?? sourceColors["app-web"];
            return (
              <div key={lead.id} className="panel" style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0 }}>{lead.email}</h3>
                  <p style={{ margin: "0.25rem 0 0", opacity: 0.5, fontSize: "0.75rem" }}>
                    {formatDate(lead.createdAt)}
                  </p>
                </div>
                <span style={{
                  display: "inline-block", padding: "0.25rem 0.75rem",
                  borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700,
                  background: colors.bg, color: colors.color,
                }}>
                  {sourceLabels[lead.source] ?? lead.source}
                </span>
              </div>
            );
          })}
          {leads.length === 0 && (
            <div className="panel" style={{ textAlign: "center", opacity: 0.5, padding: "2rem" }}>
              No se encontraron leads
            </div>
          )}
        </div>
      )}
    </div>
  );
}