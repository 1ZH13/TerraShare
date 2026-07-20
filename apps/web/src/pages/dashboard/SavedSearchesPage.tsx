import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SearchX, Trash2 } from "lucide-react";
import type { SavedSearchDto } from "@terrashare/shared";
import { getSavedSearches, deleteSavedSearch } from "../../services/api";
import EmptyState from "../../components/EmptyState";

export default function SavedSearchesPage() {
  const [searches, setSearches] = useState<SavedSearchDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getSavedSearches()
      .then((data) => {
        if (active) {
          setSearches(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error cargando búsquedas:", err);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta búsqueda guardada?")) return;
    try {
      await deleteSavedSearch(id);
      setSearches((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
      alert("Error eliminando búsqueda");
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem" }}>Cargando búsquedas...</div>;
  }

  return (
    <div>
      <div className="section-header">
        <h1>Búsquedas Guardadas</h1>
        <p>Recibe alertas cuando nuevos terrenos coincidan con tus filtros.</p>
      </div>

      {searches.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Sin búsquedas guardadas"
          description="Aún no has guardado ninguna búsqueda. Ve al catálogo para guardar tus filtros."
          action={{
            label: "Ir al catálogo",
            onClick: () => (window.location.href = "/catalog"),
          }}
        />
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {searches.map((search) => (
            <div key={search.id} className="glass-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: "0 0 0.5rem 0" }}>{search.name}</h3>
                <div style={{ fontSize: "0.9rem", color: "var(--text-200)", display: "flex", gap: "1rem" }}>
                  {search.filters.use && <span><strong>Uso:</strong> {search.filters.use}</span>}
                  {search.filters.province && <span><strong>Provincia:</strong> {search.filters.province}</span>}
                  {search.filters.maxPrice && <span><strong>Precio Max:</strong> ${search.filters.maxPrice}</span>}
                  {search.filters.query && <span><strong>Término:</strong> "{search.filters.query}"</span>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <Link
                  to="/catalog"
                  search={{
                    use: search.filters.use || "todos",
                    province: search.filters.province || "todas",
                    maxPrice: search.filters.maxPrice || 1000000,
                    query: search.filters.query || ""
                  }}
                  className="btn btn-primary"
                  style={{ textDecoration: "none", background: "var(--ts-brand)", color: "black", padding: "0.5rem 1rem", borderRadius: "999px", fontWeight: 600, fontSize: "0.9rem" }}
                >
                  Ver resultados
                </Link>
                <button
                  onClick={() => handleDelete(search.id)}
                  style={{ background: "transparent", border: "none", color: "var(--danger, #ef4444)", cursor: "pointer", padding: "0.5rem" }}
                  title="Eliminar"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
