import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import type { LandDto } from "@terrashare/shared";
import {
  Search,
  Sprout,
  MapPin,
  DollarSign,
  Tag,
  ImageIcon,
  SearchX,
  Heart,
  Columns2,
  ArrowRight,
  Bookmark,
  BookmarkPlus,
} from "lucide-react";
import {
  getLandFacets,
  photoSrc,
  searchLands,
  type LandFacets,
  type LandsPagination,
} from "../services/api";
import { formatLandPriceShort, monthlyPrice } from "../lib/land-price";
import {
  ANY_OPERATION,
  ANY_PROVINCE,
  ANY_USE,
  NO_PRICE_LIMIT,
  type CatalogFilterState,
  filtersToParams,
  hasAnyFilter,
  describeFilters,
  paramsToFilters,
  suggestName,
} from "../lib/catalog-filters";
import { createSavedSearch } from "../services/api";
import SaveSearchModal from "../components/SaveSearchModal";
import { Dropdown } from "../components/ui";
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

/** Terrenos por página en el catálogo (#366). */
const PAGE_SIZE = 12;

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

  // Paginación real contra el servidor (#366).
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<LandsPagination>({
    page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1,
  });
  const [facets, setFacets] = useState<LandFacets>({ provinces: [], uses: [] });

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

  // Las opciones de los desplegables salen de un endpoint aparte, calculado
  // sobre TODOS los terrenos publicados. Antes se derivaban de la lista
  // cargada; con la paginación en el servidor eso solo vería la página actual
  // y las opciones irían desapareciendo al navegar (#366).
  useEffect(() => {
    let active = true;
    getLandFacets()
      .then((f) => {
        if (active) setFacets(f);
      })
      .catch(() => {
        /* Sin facetas los desplegables quedan vacíos, pero el catálogo funciona. */
      });
    return () => {
      active = false;
    };
  }, []);

  // El texto se escribe letra a letra: sin esperar, cada tecla dispararía una
  // petición. El resto de filtros son desplegables y se aplican al momento.
  const [debouncedQuery, setDebouncedQuery] = useState(initialFilters.q);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  // Volver a la primera página cuando cambian los criterios: quedarse en la
  // página 4 de un resultado que ahora tiene una sola deja la pantalla vacía.
  //
  // Cambiar un filtro estando en una página distinta de la 1 dispara dos
  // peticiones (una por el criterio, otra por el salto de página), porque
  // `page` y los filtros son estados separados. Se acepta a conciencia: unificar
  // todo en un único objeto de estado evitaría la petición de más, pero
  // obligaría a leer cada `select` desde dentro de ese objeto y enreda el
  // componente para ahorrar una llamada que el usuario no percibe.
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, use, province, operation, maxPrice]);

  useEffect(() => {
    let active = true;
    setStatus((prev) => (prev === "ready" ? "ready" : "loading"));

    searchLands({
      q: debouncedQuery.trim() || undefined,
      type: use !== ANY_USE ? use : undefined,
      province: province !== ANY_PROVINCE ? province : undefined,
      operation: operation !== ANY_OPERATION ? operation : undefined,
      priceMax: maxPrice < NO_PRICE_LIMIT ? maxPrice : undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        if (!active) return;
        setLands(res.items);
        setPagination(res.pagination);
        setSelectedId(null);
        setStatus("ready");
      })
      .catch((err) => {
        console.error("Error cargando catálogo:", err);
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, use, province, operation, maxPrice, page]);

  const useOptions = facets.uses;
  const provinceOptions = facets.provinces;

  // El servidor ya devuelve la página filtrada: aquí no se vuelve a filtrar.
  const selectedLand = lands.find((l) => l.id === selectedId) ?? lands[0] ?? null;

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

        <Dropdown
          label="Filtrar por uso"
          icon={<Sprout size={15} />}
          value={use}
          onChange={setUse}
          options={[
            { value: ANY_USE, label: "Uso" },
            ...useOptions.map((opt) => ({ value: opt, label: formatUse(opt) })),
          ]}
        />

        <Dropdown
          label="Filtrar por provincia"
          icon={<MapPin size={15} />}
          value={province}
          onChange={setProvince}
          options={[
            { value: ANY_PROVINCE, label: "Provincia" },
            ...provinceOptions.map((opt) => ({ value: opt, label: opt })),
          ]}
        />

        <Dropdown
          label="Filtrar por precio"
          icon={<DollarSign size={15} />}
          value={String(maxPrice)}
          onChange={(v) => setMaxPrice(Number(v))}
          options={priceOptionsWith(maxPrice).map((opt) => ({
            value: String(opt.value),
            label: opt.label,
          }))}
        />

        <Dropdown
          label="Filtrar por tipo de operación"
          icon={<Tag size={15} />}
          value={operation}
          onChange={setOperation}
          options={[
            { value: ANY_OPERATION, label: "Alquiler / Venta" },
            { value: "alquiler", label: "En alquiler" },
            { value: "venta", label: "En venta" },
          ]}
        />

        {/* Las dos acciones van juntas y alineadas a la derecha: al envolverse
            bajan como bloque, en vez de dejar una suelta debajo (#379). */}
        <div className="cat-filters__actions">
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
      </div>

      {saveFeedback && (
        <p className="cat-savefeedback" role="status">{saveFeedback}</p>
      )}

      {/* lista + mapa */}
      <div className="cat-body">
        <div className="cat-listcol">
          <div className="cat-listhead">
            {/* El total viene del servidor, no del tamaño de la página: decir
                «12 terrenos» cuando hay 36 es justo el fallo de #365. */}
            {status === "ready"
              ? `${pagination.totalItems} terreno${pagination.totalItems === 1 ? "" : "s"}${
                  pagination.totalPages > 1 ? ` · página ${pagination.page} de ${pagination.totalPages}` : ""
                } · ordenar por `
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
          ) : lands.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Sin resultados"
              description="No encontramos terrenos con esos filtros. Prueba ampliar la búsqueda."
              action={{
                label: "Limpiar filtros",
                // El tipo de operación se quedaba fuera: se limpiaba todo lo
                // demás y la lista seguía vacía sin explicación (#379).
                onClick: () => {
                  setQuery("");
                  setUse(ANY_USE);
                  setProvince(ANY_PROVINCE);
                  setOperation(ANY_OPERATION);
                  setMaxPrice(NO_PRICE_LIMIT);
                },
              }}
            />
          ) : (
            <div className="cat-list">
              {lands.map((land) => {
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

          {status === "ready" && pagination.totalPages > 1 && (
            <nav className="cat-pager" aria-label="Paginación del catálogo">
              <button
                type="button"
                className="cat-pager__btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
              >
                Anterior
              </button>
              <span className="cat-pager__status" aria-live="polite">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <button
                type="button"
                className="cat-pager__btn"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
              >
                Siguiente
              </button>
            </nav>
          )}
        </div>

        <div className="cat-mapcol">
          <PanamaMap
            lands={lands}
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
