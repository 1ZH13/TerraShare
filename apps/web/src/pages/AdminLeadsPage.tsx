import { useEffect, useState } from "react";
import { listAdminLeads, type AdminLead } from "../services/adminApi";

const sourceLabels: Record<string, string> = {
  landing: "Landing Page",
  "app-web": "App Web",
  "admin-dashboard": "Admin Dashboard",
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const filters: { source?: string; search?: string } = {};
    if (filter !== "all") filters.source = filter;
    if (search.trim()) filters.search = search.trim();

    listAdminLeads(filters)
      .then((res) => {
        if (active) setLeads(res.data?.leads ?? []);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Error al cargar leads");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filter, search]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
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
        <p>Correos captados desde la landing y la plataforma</p>
      </div>

      <div className="admin-toolbar" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
        <input
          type="search"
          placeholder="Buscar por email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-input"
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="admin-input">
          <option value="all">Todas las fuentes</option>
          <option value="landing">Landing Page</option>
          <option value="app-web">App Web</option>
          <option value="admin-dashboard">Admin Dashboard</option>
        </select>
      </div>

      {error && (
        <div className="glass-panel" style={{ marginTop: "1rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <p style={{ color: "var(--danger)" }}>Error: {error}</p>
        </div>
      )}

      {loading ? (
        <div className="glass-panel" style={{ marginTop: "1.5rem", textAlign: "center", padding: "3rem" }}>
          <p>Cargando leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="glass-panel" style={{ marginTop: "1.5rem" }}>
          <p>No hay leads que coincidan.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ marginTop: "1.5rem", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.7 }}>
                <th style={{ padding: "0.5rem" }}>Email</th>
                <th style={{ padding: "0.5rem" }}>Fuente</th>
                <th style={{ padding: "0.5rem" }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} style={{ borderTop: "1px solid var(--border, rgba(0,0,0,0.08))" }}>
                  <td style={{ padding: "0.5rem" }}>{lead.email}</td>
                  <td style={{ padding: "0.5rem" }}>
                    <span className="card-badge">{sourceLabels[lead.source] ?? lead.source}</span>
                  </td>
                  <td style={{ padding: "0.5rem", whiteSpace: "nowrap", opacity: 0.7 }}>{formatDate(lead.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: "0.75rem", opacity: 0.6, fontSize: "0.85rem" }}>{leads.length} lead{leads.length !== 1 ? "s" : ""}</p>
        </div>
      )}
    </div>
  );
}
