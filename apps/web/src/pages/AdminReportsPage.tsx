import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, ChevronDown, Flag } from "lucide-react";
import { listAdminReports } from "../services/adminApi";
import type { AdminReportSummary } from "../services/adminApi";
import { REASON_LABELS, STATUS_BADGE, STATUS_LABELS, TARGET_LABELS } from "./reportLabels";
import "./admin.css";

const COLS = "1.6fr 1fr 1.4fr 0.9fr var(--adm-action-col)";

export default function AdminReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<AdminReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const filters: { status?: string; search?: string } = {};
    if (status !== "all") filters.status = status;
    if (search.trim()) filters.search = search.trim();

    listAdminReports(filters)
      .then((res) => setReports(res.data?.items ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [status, search]);

  return (
    <>
      <h1 className="adm-title">Reportes</h1>
      <p className="adm-sub">Modera terrenos, usuarios y chats reportados por la comunidad.</p>

      <div className="adm-toolbar">
        <div className="adm-search">
          <span className="adm-search__icon">
            <Search size={17} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por elemento, motivo o quien reporta…"
            aria-label="Buscar reportes"
          />
        </div>
        <label className="adm-pill">
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por estado">
            <option value="all">Estado</option>
            <option value="open">Abiertos</option>
            <option value="reviewing">En revisión</option>
            <option value="resolved">Resueltos</option>
            <option value="dismissed">Descartados</option>
          </select>
          <ChevronDown size={14} />
        </label>
      </div>

      <div className="adm-table">
        <div className="adm-trow adm-trow--head" style={{ gridTemplateColumns: COLS }}>
          <span>Elemento</span>
          <span>Motivo</span>
          <span>Reportado por</span>
          <span>Estado</span>
          <span />
        </div>
        {loading ? (
          <div className="adm-empty">Cargando…</div>
        ) : error ? (
          <div className="adm-empty adm-empty--error">No pudimos cargar los reportes.</div>
        ) : reports.length === 0 ? (
          <div className="adm-empty">No hay reportes que coincidan.</div>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="adm-trow" style={{ gridTemplateColumns: COLS }}>
              <div className="adm-user">
                <span className="adm-user__avatar" aria-hidden="true">
                  <Flag size={15} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="adm-user__name">{r.targetLabel}</div>
                  <div className="adm-user__email">{TARGET_LABELS[r.targetType]}</div>
                </div>
              </div>
              <span>{REASON_LABELS[r.reason]}</span>
              <span className="adm-cell--muted">{r.reporterEmail}</span>
              <span>
                <span className={`adm-badge ${STATUS_BADGE[r.status]}`}>{STATUS_LABELS[r.status]}</span>
              </span>
              <span className="adm-cell--right">
                <button
                  type="button"
                  className="adm-act"
                  onClick={() => navigate({ to: "/dashboard/admin/reports/$id", params: { id: r.id } })}
                >
                  Ver
                </button>
              </span>
            </div>
          ))
        )}
      </div>

      {!loading && !error && reports.length > 0 && (
        <div className="adm-foot">
          <span>{reports.length} reporte{reports.length !== 1 ? "s" : ""}</span>
        </div>
      )}
    </>
  );
}
