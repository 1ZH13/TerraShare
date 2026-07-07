import { useState, useEffect } from "react";
import type { LandDto } from "@terrashare/shared";
import { Search, ChevronDown } from "lucide-react";
import { listAdminLands, updateLandStatus } from "../services/adminApi";
import "./admin.css";

// Admin view: status is broader than LandStatus (includes "rejected") and the
// summary adds ownerEmail.
type AdminLand = Omit<LandDto, "status"> & { status: string; ownerEmail?: string };

const USE_LABELS: Record<string, string> = {
  agricultura: "Agricultura",
  ganaderia: "Ganadería",
  forestal: "Forestal",
  acuicultura: "Acuicultura",
  mixto: "Mixto",
  otro: "Otro",
};

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Borrador", cls: "adm-badge--amber" },
  active: { label: "Publicada", cls: "adm-badge--green" },
  inactive: { label: "Pausada", cls: "adm-badge--amber" },
  rejected: { label: "Oculta", cls: "adm-badge--red" },
};

export default function AdminLandsPage() {
  const [lands, setLands] = useState<AdminLand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const filters: { status?: string; search?: string } = {};
    if (filter !== "all") filters.status = filter;
    if (search.trim()) filters.search = search.trim();

    listAdminLands(filters)
      .then((res) => setLands((((res.data as unknown) as { items?: AdminLand[] })?.items ?? [])))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [filter, search]);

  const handleUpdateStatus = async (landId: string, nextStatus: string) => {
    try {
      await updateLandStatus(landId, nextStatus);
      setLands((prev) => prev.map((l) => (l.id === landId ? { ...l, status: nextStatus } : l)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  const cols = "1.6fr 1fr 0.8fr 0.8fr auto";

  return (
    <>
      <h1 className="adm-title">Terrenos</h1>
      <p className="adm-sub">Todas las publicaciones de la plataforma.</p>

      <div className="adm-toolbar">
        <div className="adm-search">
          <span className="adm-search__icon">
            <Search size={17} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título o provincia…"
            aria-label="Buscar terrenos"
          />
        </div>
        <label className="adm-pill">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrar por estado">
            <option value="all">Estado</option>
            <option value="draft">Borrador</option>
            <option value="active">Publicadas</option>
            <option value="inactive">Pausadas</option>
            <option value="rejected">Ocultas</option>
          </select>
          <ChevronDown size={14} />
        </label>
      </div>

      <div className="adm-table">
        <div className="adm-trow adm-trow--head" style={{ gridTemplateColumns: cols }}>
          <span>Terreno</span>
          <span>Dueño</span>
          <span>Uso</span>
          <span>Estado</span>
          <span />
        </div>
        {loading ? (
          <div className="adm-empty">Cargando…</div>
        ) : error ? (
          <div className="adm-empty adm-empty--error">No pudimos cargar los terrenos.</div>
        ) : lands.length === 0 ? (
          <div className="adm-empty">No se encontraron terrenos.</div>
        ) : (
          lands.map((land) => {
            const st = STATUS[land.status] ?? { label: land.status, cls: "adm-badge--amber" };
            return (
              <div key={land.id} className="adm-trow" style={{ gridTemplateColumns: cols }}>
                <span className="adm-cell--strong">{land.title}</span>
                <span className="adm-cell--muted adm-user__email">{land.ownerEmail ?? "—"}</span>
                <span>{USE_LABELS[land.allowedUses?.[0]] ?? "—"}</span>
                <span>
                  <span className={`adm-badge ${st.cls}`}>{st.label}</span>
                </span>
                <span className="adm-cell--right">
                  {land.status === "draft" ? (
                    <button type="button" className="adm-act" onClick={() => handleUpdateStatus(land.id, "active")}>
                      Aprobar
                    </button>
                  ) : land.status === "active" ? (
                    <button
                      type="button"
                      className="adm-act adm-act--danger"
                      onClick={() => handleUpdateStatus(land.id, "inactive")}
                    >
                      Ocultar
                    </button>
                  ) : (
                    <button type="button" className="adm-act" onClick={() => handleUpdateStatus(land.id, "active")}>
                      Restaurar
                    </button>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>

      {!loading && !error && lands.length > 0 && (
        <div className="adm-foot">
          <span>{lands.length} terreno{lands.length !== 1 ? "s" : ""}</span>
        </div>
      )}
    </>
  );
}
