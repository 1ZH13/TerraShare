import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bookmark, Search, Trash2, Loader2 } from "lucide-react";

import { listSavedSearches, deleteSavedSearch, type SavedSearchDto } from "../services/api";
import { describeFilters, filtersToParams, paramsToFilters } from "../lib/catalog-filters";
import EmptyState from "../components/EmptyState";
import "./searches.css";

type LoadState = "loading" | "ready" | "error";

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-PA", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Búsquedas guardadas (HU-99 / #368).
 *
 * El backend y el cliente existían desde #325, pero ninguna pantalla los usaba:
 * no había forma de crear, ver ni borrar una búsqueda desde la app, así que las
 * alertas por correo eran inalcanzables en la práctica.
 */
export default function SavedSearchesPage() {
  const [searches, setSearches] = useState<SavedSearchDto[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listSavedSearches()
      .then((data) => {
        if (!active) return;
        setSearches(data);
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, []);

  const handleDelete = async (id: string, name: string) => {
    setDeleting(id);
    setError(null);
    try {
      const ok = await deleteSavedSearch(id);
      if (ok) {
        setSearches((prev) => prev.filter((s) => s.id !== id));
      } else {
        setError(`No se pudo eliminar «${name}».`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : `No se pudo eliminar «${name}».`);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="srch">
      <header className="srch-head">
        <div>
          <h1 className="srch-title">Búsquedas guardadas</h1>
          <p className="srch-sub">
            Te avisamos por correo cuando se publica un terreno que encaja con tus criterios.
          </p>
        </div>
        <Link to="/catalog" className="srch-cta">
          <Search size={16} /> Buscar terrenos
        </Link>
      </header>

      {error && <div className="srch-error" role="alert">{error}</div>}

      {status === "loading" ? (
        <div className="srch-state">Cargando tus búsquedas…</div>
      ) : status === "error" ? (
        <div className="srch-state srch-state--error">
          No pudimos cargar tus búsquedas guardadas. Inténtalo de nuevo en un momento.
        </div>
      ) : searches.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Todavía no has guardado ninguna búsqueda"
          description="Filtra el catálogo a tu gusto y pulsa «Guardar búsqueda» para recibir avisos de los terrenos nuevos que encajen."
          action={{ label: "Ir al catálogo", to: "/catalog" }}
        />
      ) : (
        <ul className="srch-list">
          {searches.map((s) => (
            <li key={s.id} className="srch-card">
              <div className="srch-card__body">
                <h2 className="srch-card__name">{s.name}</h2>
                <p className="srch-card__filters">{describeFilters(s.filters)}</p>
                {formatDate(s.createdAt) && (
                  <p className="srch-card__date">Guardada el {formatDate(s.createdAt)}</p>
                )}
              </div>
              <div className="srch-card__actions">
                <Link
                  to="/catalog"
                  // Los mismos criterios viajan como parámetros de la URL, así
                  // que «Aplicar» deja el catálogo tal cual estaba al guardar.
                  search={filtersToParams(paramsToFilters(s.filters))}
                  className="srch-apply"
                >
                  <Search size={15} /> Aplicar
                </Link>
                <button
                  type="button"
                  className="srch-delete"
                  onClick={() => handleDelete(s.id, s.name)}
                  disabled={deleting === s.id}
                  aria-label={`Eliminar la búsqueda ${s.name}`}
                >
                  {deleting === s.id ? <Loader2 size={15} className="srch-spin" /> : <Trash2 size={15} />}
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
