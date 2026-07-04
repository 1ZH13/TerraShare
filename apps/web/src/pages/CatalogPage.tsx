import { useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LandDto } from "@terrashare/shared";
import { Input } from "../components/ui";
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

function formatUse(use?: string): string {
  if (!use) return "Terreno";
  return USE_LABELS[use] ?? use;
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5L9 20" />
    </svg>
  );
}

export default function CatalogPage() {
  const navigate = useNavigate();
  const searchId = useId();
  const useId_ = useId();
  const provinceId = useId();
  const priceId = useId();

  const [lands, setLands] = useState<LandDto[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");

  const [query, setQuery] = useState("");
  const [use, setUse] = useState("todos");
  const [province, setProvince] = useState("todas");
  const [maxPrice, setMaxPrice] = useState(3000);
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
    <>
      <div className="cat-head">
        <h1 className="ts-title">Terrenos disponibles</h1>
        <p>Explora en el mapa y encuentra el terreno ideal en Panamá.</p>
      </div>

      <div className="cat-filters">
        <div className="cat-filter">
          <label htmlFor={searchId}>Buscar</label>
          <Input
            id={searchId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Provincia, uso o palabra clave…"
          />
        </div>
        <div className="cat-filter">
          <label htmlFor={useId_}>Uso</label>
          <select id={useId_} value={use} onChange={(e) => setUse(e.target.value)}>
            <option value="todos">Todos</option>
            {useOptions.map((opt) => (
              <option key={opt} value={opt}>
                {formatUse(opt)}
              </option>
            ))}
          </select>
        </div>
        <div className="cat-filter">
          <label htmlFor={provinceId}>Provincia</label>
          <select id={provinceId} value={province} onChange={(e) => setProvince(e.target.value)}>
            <option value="todas">Todas</option>
            {provinceOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div className="cat-filter">
          <label htmlFor={priceId}>Precio máx.</label>
          <input
            id={priceId}
            type="range"
            min={300}
            max={3000}
            step={50}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
          />
          <span className="cat-range__value">${maxPrice.toLocaleString("es-PA")}/mes</span>
        </div>
        {/* TODO(#140): el tipo de operación (alquiler/venta) aún no existe en el
            backend; el filtro se muestra deshabilitado para no simular que filtra. */}
        <div className="cat-filter">
          <label aria-hidden="true">&nbsp;</label>
          <span className="cat-soon" role="note" title="Disponible próximamente">
            Alquiler / Venta
            <span className="cat-soon__tag">Próximamente</span>
          </span>
        </div>
      </div>

      <div className="cat-meta">
        {status === "ready" ? `${filtered.length} terreno${filtered.length === 1 ? "" : "s"}` : " "}
      </div>

      <div className="cat-workspace">
        <div>
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
                  <div
                    key={land.id}
                    className={`cat-card ${selectedLand?.id === land.id ? "is-active" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(land.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(land.id);
                      }
                    }}
                    onDoubleClick={() => navigate(`/lands/${land.id}`)}
                  >
                    <div className="cat-card__thumb" aria-hidden="true">
                      <PhotoIcon />
                    </div>
                    <div className="cat-card__body">
                      <div className="cat-card__top">
                        <span className="cat-card__title">{land.title}</span>
                        <span className="ds-badge ds-badge--green">{formatUse(land.allowedUses?.[0])}</span>
                      </div>
                      <div className="cat-card__meta">
                        <PinIcon />
                        {land.location?.province} · {land.area} ha
                      </div>
                      <div className="cat-card__price">
                        {typeof price === "number" ? (
                          <>
                            ${price.toLocaleString("es-PA")}
                            <span>/mes</span>
                          </>
                        ) : (
                          <span>Precio a consultar</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="ds-btn ds-btn--ghost ds-btn--sm"
                        style={{ marginTop: "0.5rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/lands/${land.id}`);
                        }}
                      >
                        Ver detalle
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="cat-map">
          <PanamaMap
            lands={filtered}
            selectedLand={selectedLand}
            onSelectLand={(land) => setSelectedId(land.id)}
          />
        </div>
      </div>
    </>
  );
}
