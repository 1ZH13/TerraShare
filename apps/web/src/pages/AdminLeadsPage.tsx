import { useEffect, useState } from "react";
import { Search, ChevronDown, Download } from "lucide-react";
import { listAdminLeads, type AdminLead } from "../services/adminApi";
import "./admin.css";

const SOURCE_LABELS: Record<string, string> = {
  landing: "Landing",
  "app-web": "App",
  "admin-dashboard": "Admin",
};

function sourceBadgeCls(source: string): string {
  return source === "landing" ? "adm-badge--green" : "adm-badge--teal";
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" });
}

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
      .catch((e) => active && setError(e instanceof Error ? e.message : "Error"))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [filter, search]);

  const exportCsv = () => {
    const rows = [["Correo", "Fuente", "Fecha"], ...leads.map((l) => [l.email, l.source, l.createdAt ?? ""])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "terrashare-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const cols = "2fr 1fr 1fr";

  return (
    <>
      <h1 className="adm-title">Leads</h1>
      <p className="adm-sub">Correos captados desde el landing y otras fuentes.</p>

      <div className="adm-toolbar">
        <div className="adm-search">
          <span className="adm-search__icon">
            <Search size={17} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por correo…"
            aria-label="Buscar leads"
          />
        </div>
        <label className="adm-pill">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrar por fuente">
            <option value="all">Fuente</option>
            <option value="landing">Landing</option>
            <option value="app-web">App</option>
            <option value="admin-dashboard">Admin</option>
          </select>
          <ChevronDown size={14} />
        </label>
        <button type="button" className="adm-pill adm-pill--cta" onClick={exportCsv} disabled={leads.length === 0}>
          <Download size={15} /> Exportar
        </button>
      </div>

      <div className="adm-table">
        <div className="adm-trow adm-trow--head" style={{ gridTemplateColumns: cols }}>
          <span>Correo</span>
          <span>Fuente</span>
          <span>Fecha</span>
        </div>
        {loading ? (
          <div className="adm-empty">Cargando…</div>
        ) : error ? (
          <div className="adm-empty adm-empty--error">No pudimos cargar los leads.</div>
        ) : leads.length === 0 ? (
          <div className="adm-empty">No hay leads que coincidan.</div>
        ) : (
          leads.map((lead) => (
            <div key={lead.id} className="adm-trow" style={{ gridTemplateColumns: cols }}>
              <span className="adm-cell--strong adm-user__email">{lead.email}</span>
              <span>
                <span className={`adm-badge ${sourceBadgeCls(lead.source)}`}>
                  {SOURCE_LABELS[lead.source] ?? lead.source}
                </span>
              </span>
              <span className="adm-cell--muted">{formatDate(lead.createdAt)}</span>
            </div>
          ))
        )}
      </div>

      {!loading && !error && leads.length > 0 && (
        <div className="adm-foot">
          <span>{leads.length} lead{leads.length !== 1 ? "s" : ""} captado{leads.length !== 1 ? "s" : ""}</span>
        </div>
      )}
    </>
  );
}
