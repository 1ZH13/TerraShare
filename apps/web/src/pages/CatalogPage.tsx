import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { LandDto } from "@terrashare/shared";
import { Search, Sprout, MapPin, DollarSign, Tag, ChevronDown, ImageIcon } from "lucide-react";
import { listLands } from "../services/api";
import PanamaMap from "../components/PanamaMap";
import "./catalog.css";

type LoadState = "loading" | "ready" | "error";

const USE_LABELS: Record<string, string> = {
  agricultura: "Agricultura",
  ganaderia: "Ganadería",
  forestal: "Forestal",
  acuicultura: "Acuicultura",
  mixto: "Mixto",
  otro: "Otro",
};

const PRICE_OPTIONS = [
  { label: "Precio", value: 1_000_000 },
  { label: "Hasta $500", value: 500 },
  { label: "Hasta $1,000", value: 1000 },
  { label: "Hasta $2,000", value: 2000 },
  { label: "Hasta $5,000", value: 5000 },
];

function formatUse(use?: string): string {
  if (!use) return "Terreno";
  return USE_LABELS[use] ?? use;
}

export default function CatalogPage() {
  const navigate = useNavigate();

  const [lands, setLands] = useState<LandDto[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");

  const [query, setQuery] = useState("");
  const [use, setUse] = useState("todos");
  const [province, setProvince] = useState("todas");
  const [maxPrice, setMaxPrice] = useState(1_000_000);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listLands()
      .then((data) => {
        if (!active) return;
        setLands(data);
        setStatus("ready");
      })
      .catch((err) => {
        console.error("Error cargando catálogo:", err);
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const useOptions = useMemo(
    () => [...new Set(lands.map((l) => l.allowedUses?.[0]).filter((v): v is NonNullable<typeof v> => Boolean(v)))],
    [lands],
  );
  const provinceOptions = useMemo(
    () => [...new Set(lands.map((l) => l.location?.province).filter((v): v is string => Boolean(v)))],
    [lands],
  );

  const filtered = useMemo(() => {
    return lands.filter((land) => {
      const landUse = land.allowedUses?.[0] ?? "otro";
      const price = land.priceRule?.pricePerMonth ?? 0;
      const matchesUse = use === "todos" || landUse === use;
      const matchesProvince = province === "todas" || land.location?.province === province;
      const matchesPrice = price <= maxPrice;
      const haystack = [land.title, land.location?.province, land.location?.district, land.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !query || haystack.includes(query.toLowerCase());
      return matchesUse && matchesProvince && matchesPrice && matchesQuery;
    });
  }, [lands, use, province, maxPrice, query]);

  const selectedLand = filtered.find((l) => l.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="cat">
      {/* barra de filtros */}
      <div className="cat-filters">
        <div className="cat-search">
          <span className="cat-search__icon">
            <Search size={18} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar terreno…"
            aria-label="Buscar terreno"
          />
        </div>

        <label className="cat-pill">
          <span className="cat-pill__icon">
            <Sprout size={15} />
          </span>
          <select value={use} onChange={(e) => setUse(e.target.value)} aria-label="Filtrar por uso">
            <option value="todos">Uso</option>
            {useOptions.map((opt) => (
              <option key={opt} value={opt}>
                {formatUse(opt)}
              </option>
            ))}
          </select>
          <span className="cat-pill__chev">
            <ChevronDown size={14} />
          </span>
        </label>

        <label className="cat-pill">
          <span className="cat-pill__icon">
            <MapPin size={15} />
          </span>
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            aria-label="Filtrar por provincia"
          >
            <option value="todas">Provincia</option>
            {provinceOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span className="cat-pill__chev">
            <ChevronDown size={14} />
          </span>
        </label>

        <label className="cat-pill">
          <span className="cat-pill__icon">
            <DollarSign size={15} />
          </span>
          <select
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            aria-label="Filtrar por precio"
          >
            {PRICE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="cat-pill__chev">
            <ChevronDown size={14} />
          </span>
        </label>

        {/* TODO(#140): el tipo de operación (alquiler/venta) aún no existe en el
            backend; el filtro se muestra como "próximamente". */}
        <span className="cat-pill cat-pill--soon" role="note" title="Disponible próximamente">
          <span className="cat-pill__icon">
            <Tag size={15} />
          </span>
          Alquiler / Venta
          <span className="cat-soon__tag">Pronto</span>
        </span>
      </div>

      {/* lista + mapa */}
      <div className="cat-body">
        <div className="cat-listcol">
          <div className="cat-listhead">
            {status === "ready"
              ? `${filtered.length} terreno${filtered.length === 1 ? "" : "s"} · ordenar por `
              : "Cargando terrenos · "}
            <strong>Recientes</strong>
          </div>

          {status === "loading" ? (
            <div className="cat-list">
              <div className="cat-skeleton" />
              <div className="cat-skeleton" />
              <div className="cat-skeleton" />
            </div>
          ) : status === "error" ? (
            <p className="cat-state cat-state--error">
              No pudimos cargar el catálogo ahora mismo. Vuelve a intentarlo en un momento.
            </p>
          ) : filtered.length === 0 ? (
            <p className="cat-state">No hay terrenos que coincidan con estos filtros.</p>
          ) : (
            <div className="cat-list">
              {filtered.map((land) => {
                const price = land.priceRule?.pricePerMonth;
                return (
                  <button
                    key={land.id}
                    type="button"
                    className={`cat-card ${selectedLand?.id === land.id ? "is-active" : ""}`}
                    onClick={() => setSelectedId(land.id)}
                    onDoubleClick={() => navigate(`/lands/${land.id}`)}
                  >
                    <div className="cat-card__thumb" aria-hidden="true">
                      <ImageIcon size={24} strokeWidth={1.5} />
                    </div>
                    <div className="cat-card__body">
                      <div className="cat-card__top">
                        <span className="cat-card__title">{land.title}</span>
                        <span className="cat-card__badge">{formatUse(land.allowedUses?.[0])}</span>
                      </div>
                      <div className="cat-card__meta">
                        <MapPin size={14} /> {land.location?.province} · {land.area} ha
                      </div>
                      <div className="cat-card__price">
                        {typeof price === "number" ? (
                          <>
                            ${price.toLocaleString("es-PA")}
                            <span>/mes</span>
                          </>
                        ) : (
                          <span style={{ fontSize: "14px" }}>Precio a consultar</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="cat-mapcol">
          <PanamaMap
            lands={filtered}
            selectedLand={selectedLand}
            onSelectLand={(land) => setSelectedId(land.id)}
          />
          {selectedLand && (
            <div className="cat-mapcard">
              <div style={{ minWidth: 0 }}>
                <div className="cat-mapcard__title">{selectedLand.title}</div>
                <div className="cat-mapcard__sub">
                  {selectedLand.location?.province}
                  {typeof selectedLand.priceRule?.pricePerMonth === "number"
                    ? ` · $${selectedLand.priceRule.pricePerMonth.toLocaleString("es-PA")}/mes`
                    : ""}
                </div>
              </div>
              <Link to={`/lands/${selectedLand.id}`} className="cat-mapcard__go">
                Ver
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
