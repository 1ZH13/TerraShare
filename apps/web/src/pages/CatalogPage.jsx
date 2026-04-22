import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";
import { listLands, adaptLand } from "../services/api";

const TIPOS_USO = [
  { value: "all", label: "Todos los tipos" },
  { value: "agricultura", label: "Agricultura" },
  { value: "ganaderia", label: "Ganaderia" },
  { value: "forestal", label: "Forestal" },
  { value: "acuicultura", label: "Acuicultura" },
  { value: "mixto", label: "Mixto" },
  { value: "otro", label: "Otro" },
];

const PROVINCIAS = [
  { value: "", label: "Todas las provincias" },
  { value: "Bocas del Toro", label: "Bocas del Toro" },
  { value: "Cocle", label: "Cocle" },
  { value: "Colon", label: "Colon" },
  { value: "Chiriqui", label: "Chiriqui" },
  { value: "Darien", label: "Darien" },
  { value: " Herrera", label: "Herrera" },
  { value: "Los Santos", label: "Los Santos" },
  { value: "Panama", label: "Panama" },
  { value: "Veraguas", label: "Veraguas" },
];

export default function CatalogPage() {
  const { openSignUp } = useClerk();
  const [filters, setFilters] = useState({
    type: "all",
    location: "",
    maxPrice: "",
    availableOn: "",
  });
  const [lands, setLands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    const load = async () => {
      try {
        const raw = await listLands(filters);
        if (active) setLands(raw.map(adaptLand));
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [filters]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" aria-hidden="true" />
      <div className="ambient ambient-right" aria-hidden="true" />

      <header className="top-nav">
        <Link to="/" className="brand">TerraShare</Link>
        <nav className="menu">
          <Link to="/catalog" className="active">Explorar</Link>
          <Link to="/login">Iniciar sesion</Link>
        </nav>
        <button className="btn btn-primary" onClick={() => openSignUp({})}>
          Crear cuenta
        </button>
      </header>

      <main>
        <div className="section-header" style={{ marginBottom: "1.25rem" }}>
          <h1>Catalogo de terrenos</h1>
          <p>
            Explora terrenos disponibles en Panama. Sin registro puedes
            navegar y filtrar; activa tu cuenta para solicitar.
          </p>
        </div>

        {/* ── Filtros ─────────────────────────────── */}
        <div className="panel filters-panel">
          <div className="filters-grid">
            <label>
              Tipo de uso
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
              >
                {TIPOS_USO.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>

            <label>
              Provincia
              <select
                value={filters.location}
                onChange={(e) => handleFilterChange("location", e.target.value)}
              >
                {PROVINCIAS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>

            <label>
              Precio max/mes (USD)
              <input
                type="number"
                placeholder="Ej: 800"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                min="0"
              />
            </label>

            <label>
              Disponible desde
              <input
                type="date"
                value={filters.availableOn}
                onChange={(e) => handleFilterChange("availableOn", e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* ── Resultados ──────────────────────────── */}
        <div className="panel results-panel">
          {loading ? (
            <p style={{ textAlign: "center", padding: "2rem" }}>Cargando terrenos...</p>
          ) : error ? (
            <div className="toast toast-error">
              <strong>Error</strong>
              <p>{error}</p>
            </div>
          ) : lands.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <h3>No hay terrenos con esos filtros</h3>
              <p>Intenta ampliar los criterios de busqueda.</p>
            </div>
          ) : (
            <div className="cards-grid">
              {lands.map((land) => (
                <article key={land.id} className="land-card">
                  <p className="card-badge">{land.type}</p>
                  <h3>{land.title}</h3>
                  <p>{land.province}{land.district ? `, ${land.district}` : ""}</p>
                  <p>
                    {land.areaHectares} ha &middot;{" "}
                    {land.monthlyPrice > 0 ? `$${land.monthlyPrice}/mes` : "Precio variable"}
                  </p>
                  <div className="card-actions">
                    <Link to={`/lands/${land.id}`} className="btn btn-primary">
                      Ver detalle
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}