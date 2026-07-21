import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import type { LandDto } from "@terrashare/shared";
import {
  Search,
  Sprout,
  MapPin,
  DollarSign,
  Tag,
  ChevronDown,
  ImageIcon,
  SearchX,
  Heart,
  Columns2,
  ArrowRight,
  Bookmark,
  BookmarkPlus,
} from "lucide-react";
import { listLands, photoSrc } from "../services/api";
import { formatLandPriceShort, monthlyPrice } from "../lib/land-price";
import {
  type CatalogFilterState,
  filtersToParams,
  hasAnyFilter,
  describeFilters,
  paramsToFilters,
  suggestName,
} from "../lib/catalog-filters";
import { createSavedSearch } from "../services/api";
import SaveSearchModal from "../components/SaveSearchModal";
import PanamaMap from "../components/LazyPanamaMap";
import EmptyState from "../components/EmptyState";
import { useFavorites } from "../hooks/useFavorites";
import { useCompareLands } from "../hooks/useCompareLands";
import "./catalog.css";
import "./compare.css";

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

/**
 * Opciones del desplegable de precio, añadiendo el valor activo si no está
 * entre las predefinidas.
 *
 * Una búsqueda guardada puede traer cualquier tope (p. ej. $1.500). Sin esto,
 * el `select` no encuentra su valor, se queda mostrando «Precio» y el usuario
 * ve un filtro aplicado que la interfaz niega estar aplicando.
 */
function priceOptionsWith(active: number) {
  if (active >= 1_000_000 || PRICE_OPTIONS.some((o) => o.value === active)) {
    return PRICE_OPTIONS;
  }
  return [...PRICE_OPTIONS, { label: `Hasta $${active.toLocaleString("es-PA")}`, value: active }]
    .sort((a, b) => a.value - b.value);
}

export default function CatalogPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });

  const [lands, setLands] = useState<LandDto[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");

  // Favoritos (#147): el catálogo vive tras login, así que siempre habilitado.
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  // Comparador (HU-98 / #324): localStorage, máx. 3, sin backend.
  const {
    ids: compareIds,
    count: compareCount,
    max: compareMax,
    isCompared,
    toggle: toggleCompare,
    clear: clearCompare,
  } = useCompareLands();
  const [compareToast, setCompareToast] = useState<string | null>(null);

  // Los filtros pueden venir en la URL: así una búsqueda guardada se «aplica»
  // navegando aquí, y de paso el catálogo filtrado es un enlace compartible
  // (HU-99 / #368).
  const initialFilters = paramsToFilters(search as Record<string, unknown>);

  const [query, setQuery] = useState(initialFilters.q);
  const [use, setUse] = useState(initialFilters.use);
  const [province, setProvince] = useState(initialFilters.province);
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice);
  // Tipo de operación (#365). El campo `operation` existe en el backend desde
  // #249; el filtro llevaba desde entonces pintado como «Pronto».
  const [operation, setOperation] = useState(initialFilters.operation);

  // Guardar búsqueda (HU-99 / #368).
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState("");

  const currentFilters: CatalogFilterState = { q: query, use, province, operation, maxPrice };
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!compareToast) return;
    const t = window.setTimeout(() => setCompareToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [compareToast]);

  const handleToggleCompare = (landId: string) => {
    const result = toggleCompare(landId);
    if (!result.ok && result.full) {
      setCompareToast(`Solo puedes comparar hasta ${compareMax} terrenos`);
    }
  };

  useEffect(() => {
    let active = true;
    // El catálogo filtra, ordena y pinta el mapa **en el cliente**, así que
    // necesita el conjunto completo. Sin `pageSize`, el backend devolvía su
    // página por defecto de 20 y el resto de terrenos era inalcanzable: no hay
    // paginador en esta pantalla, así que desaparecían sin previo aviso.
    // 100 es el máximo que admite la ruta; por encima de esa escala habría que
    // mover los filtros al servidor y paginar de verdad (#366).
    listLands({ pageSize: 100 })
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
      const matchesUse = use === "todos" || landUse === use;
      const matchesProvince = province === "todas" || land.location?.province === province;
      // El filtro de precio solo aplica a lo que se alquila: un terreno de solo
      // venta no tiene renta con la que compararse, y contarlo como 0 lo colaba
      // en todos los tramos «hasta $X».
      const monthly = monthlyPrice(land);
      const matchesPrice = maxPrice >= 1_000_000 || (monthly !== null && monthly <= maxPrice);
      // «ambas» cuenta para las dos caras del filtro.
      const matchesOperation =
        operation === "todas"
        || land.operation === operation
        || land.operation === "ambas";
      const haystack = [land.title, land.location?.province, land.location?.district, land.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !query || haystack.includes(query.toLowerCase());
      return matchesUse && matchesProvince && matchesPrice && matchesOperation && matchesQuery;
    });
  }, [lands, use, province, maxPrice, operation, query]);

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
            {priceOptionsWith(maxPrice).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="cat-pill__chev">
            <ChevronDown size={14} />
          </span>
        </label>

        <label className="cat-pill">
          <span className="cat-pill__icon">
            <Tag size={15} />
          </span>
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            aria-label="Filtrar por tipo de operación"
          >
            <option value="todas">Alquiler / Venta</option>
            <option value="alquiler">En alquiler</option>
            <option value="venta">En venta</option>
          </select>
          <span className="cat-pill__chev">
            <ChevronDown size={14} />
          </span>
        </label>

        {/* Guardar la búsqueda actual (HU-99 / #368). Sin criterios no tiene
            sentido: una alerta «de cualquier terreno» sería solo ruido. */}
        <button
          type="button"
          className="cat-pill cat-pill--action"
          onClick={() => { setSaveFeedback(""); setSaveOpen(true); }}
          disabled={!hasAnyFilter(currentFilters)}
          title={
            hasAnyFilter(currentFilters)
              ? "Guardar esta búsqueda y recibir avisos"
              : "Elige algún filtro para poder guardar la búsqueda"
          }
        >
          <span className="cat-pill__icon">
            <BookmarkPlus size={15} />
          </span>
          Guardar búsqueda
        </button>

        <Link to="/dashboard/searches" className="cat-pill cat-pill--action">
          <span className="cat-pill__icon">
            <Bookmark size={15} />
          </span>
          Mis búsquedas
        </Link>
      </div>

      {saveFeedback && (
        <p className="cat-savefeedback" role="status">{saveFeedback}</p>
      )}

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
            <EmptyState
              icon={SearchX}
              title="Sin resultados"
              description="No encontramos terrenos con esos filtros. Prueba ampliar la búsqueda."
              action={{
                label: "Limpiar filtros",
                onClick: () => {
                  setQuery("");
                  setUse("todos");
                  setProvince("todas");
                  setMaxPrice(1_000_000);
                },
              }}
            />
          ) : (
            <div className="cat-list">
              {filtered.map((land) => {
                const monthly = monthlyPrice(land);
                return (
                  <button
                    key={land.id}
                    type="button"
                    className={`cat-card ${selectedLand?.id === land.id ? "is-active" : ""}`}
                    onClick={() => setSelectedId(land.id)}
                    onDoubleClick={() => navigate({ to: "/lands/$id", params: { id: land.id } })}
                  >
                    <div className="cat-card__thumb">
                      {land.photos?.[0] ? (
                        <img
                          src={photoSrc(land.photos[0])}
                          alt={land.title ?? "Terreno"}
                          loading="lazy"
                        />
                      ) : (
                        <ImageIcon size={24} strokeWidth={1.5} aria-hidden="true" />
                      )}
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      className={`cat-card__cmp${isCompared(land.id) ? " is-active" : ""}`}
                      aria-label={
                        isCompared(land.id) ? "Quitar de comparación" : "Añadir a comparación"
                      }
                      aria-pressed={isCompared(land.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCompare(land.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleCompare(land.id);
                        }
                      }}
                    >
                      <Columns2 size={15} />
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      className={`cat-card__fav${isFavorite(land.id) ? " is-active" : ""}`}
                      aria-label={isFavorite(land.id) ? "Quitar de guardados" : "Guardar terreno"}
                      aria-pressed={isFavorite(land.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(land.id).catch((err) =>
                          console.error("No se pudo actualizar el guardado:", err),
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavorite(land.id).catch((err) =>
                            console.error("No se pudo actualizar el guardado:", err),
                          );
                        }
                      }}
                    >
                      <Heart size={16} fill={isFavorite(land.id) ? "currentColor" : "none"} />
                    </span>
                    <div className="cat-card__body">
                      <div className="cat-card__top">
                        <span className="cat-card__title">{land.title}</span>
                        <span className="cat-card__badge">{formatUse(land.allowedUses?.[0])}</span>
                      </div>
                      <div className="cat-card__meta">
                        <MapPin size={14} /> {land.location?.province} · {land.area} ha
                      </div>
                      <div className="cat-card__price">
                        {monthly !== null ? (
                          <>
                            ${monthly.toLocaleString("es-PA")}
                            <span>/mes</span>
                          </>
                        ) : (
                          <span style={{ fontSize: "14px" }}>{formatLandPriceShort(land)}</span>
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
                  {selectedLand.location?.province} · {formatLandPriceShort(selectedLand)}
                </div>
              </div>
              <div className="cat-mapcard__actions">
                <button
                  type="button"
                  className={`cat-mapcard__cmp${isCompared(selectedLand.id) ? " is-active" : ""}`}
                  onClick={() => handleToggleCompare(selectedLand.id)}
                >
                  <Columns2 size={15} />
                  {isCompared(selectedLand.id) ? "En comparación" : "Comparar"}
                </button>
                <Link to="/lands/$id" params={{ id: selectedLand.id }} className="cat-mapcard__go">
                  Ver
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {compareCount > 0 && (
        <div className="cmp-bar" role="status">
          <div className="cmp-bar__text">
            {compareCount} de {compareMax} en comparación{" "}
            <span>
              ·{" "}
              {compareIds.length === 1
                ? "añade otro para comparar"
                : "listo para ver lado a lado"}
            </span>
          </div>
          <div className="cmp-bar__actions">
            <button type="button" className="cmp-bar__clear" onClick={clearCompare}>
              Vaciar
            </button>
            <Link to="/compare" className="cmp-bar__go">
              Comparar <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      )}

      {compareToast && (
        <div className="cmp-toast" role="status">
          {compareToast}
        </div>
      )}

      {saveOpen && (
        <SaveSearchModal
          summary={describeFilters(filtersToParams(currentFilters))}
          suggestedName={suggestName(currentFilters)}
          onClose={() => setSaveOpen(false)}
          onSubmit={async (name) => {
            await createSavedSearch({ name, filters: filtersToParams(currentFilters) });
            setSaveFeedback(`Búsqueda «${name}» guardada. Te avisaremos de los terrenos que encajen.`);
          }}
        />
      )}
    </div>
  );
}
