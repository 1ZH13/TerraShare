import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { filterLands, formatLandUse, getLandPrimaryUse } from "../data/lands";
import { listLands } from "../services/api";

function MapPin({ land, active, onClick }) {
  return (
    <button
      type="button"
      className={`map-pin ${active ? "active" : ""}`}
      style={{ left: `${land.mapPosition.x}%`, top: `${land.mapPosition.y}%` }}
      onClick={onClick}
      aria-label={`Ver ${land.title}`}
    >
      <span className="map-pin-dot" />
      <span className="map-pin-label">{land.location.province}</span>
    </button>
  );
}

export default function CatalogPage() {
  const navigate = useNavigate();
  const [type, setType] = useState("Todos");
  const [province, setProvince] = useState("Todas");
  const [maxPrice, setMaxPrice] = useState(700);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [lands, setLands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLands = async () => {
      try {
        const data = await listLands();
        setLands(data);
      } catch (err) {
        console.error("Error fetching lands:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLands();
  }, []);

  const filteredLands = useMemo(
    () => filterLands(lands, { type, province, maxPrice, query }),
    [lands, type, province, maxPrice, query],
  );

  const USE_FILTERS = useMemo(() => ["Todos", ...new Set(lands.map((land) => getLandPrimaryUse(land)).filter(Boolean))], [lands]);
  const PROVINCE_FILTERS = useMemo(() => ["Todas", ...new Set(lands.map((land) => land.location?.province).filter(Boolean))], [lands]);

  const selectedLand = filteredLands.find((land) => land.id === selectedId) ?? filteredLands[0] ?? null;

  const handleSelect = (land) => setSelectedId(land.id);

  const handlePinClick = (land) => {
    setSelectedId(land.id);
  };

  return (
    <div className="page-shell">
      <div className="glass-nav">
        <Link to="/" className="brand">TerraShare</Link>
        <nav className="menu">
          <Link to="/catalog" className="active">Terrenos</Link>
          <Link to="/dashboard">Dashboard</Link>
        </nav>
        <div className="auth-actions">
          <Link to="/register" className="btn btn-primary">Crear cuenta</Link>
        </div>
      </div>

      <main>
        <div className="section-header">
          <p className="kicker">Descubrimiento público</p>
          <h1>Mapa + catálogo sincronizado</h1>
          <p>Explora terrenos verificables sin login, filtra por uso, provincia y precio, y abre el detalle al instante.</p>
        </div>

        <section className="catalog-workspace glass-panel">
          <aside className="catalog-map-panel">
            <div className="section-header compact">
              <h1>Mapa</h1>
              <p>Vista geográfica MVP con pines interactivos.</p>
            </div>

            <div className="map-stage" role="img" aria-label="Mapa de terrenos">
              <div className="map-grid" />
              <div className="map-glow map-glow-one" />
              <div className="map-glow map-glow-two" />
              {filteredLands.map((land) => (
                <MapPin
                  key={land.id}
                  land={land}
                  active={selectedLand?.id === land.id}
                  onClick={() => handlePinClick(land)}
                />
              ))}
              {selectedLand && (
                <div className="map-callout">
                  <span className="card-badge">{formatLandUse(getLandPrimaryUse(selectedLand))}</span>
                  <h3>{selectedLand.title}</h3>
                  <p>{selectedLand.location.province} · {selectedLand.location.district}</p>
                  <strong>${selectedLand.priceRule.pricePerMonth}/mes</strong>
                  <button className="btn btn-primary" onClick={() => navigate(`/lands/${selectedLand.id}`)}>
                    Ver detalle
                  </button>
                </div>
              )}
            </div>
          </aside>

          <section className="catalog-list-panel">
            <div className="catalog-filters glass-card">
              <div className="filters-grid">
                <label>
                  Buscar
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Provincia, uso, agua..." />
                </label>
                <label>
                  Uso
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    {USE_FILTERS.map((option) => (
                      <option key={option} value={option}>{option === "Todos" ? option : formatLandUse(option)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Provincia
                  <select value={province} onChange={(e) => setProvince(e.target.value)}>
                    {PROVINCE_FILTERS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Precio máximo
                  <input
                    type="range"
                    min="300"
                    max="700"
                    step="10"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                  />
                  <span className="range-value">Máximo ${maxPrice}</span>
                </label>
              </div>
            </div>

            <div className="catalog-meta">
              <span>{filteredLands.length} resultados</span>
              {selectedLand && <span>Seleccionado: {selectedLand.title}</span>}
            </div>

            <div className="cards-grid catalog-results-grid">
              {filteredLands.map((land) => {
                const active = selectedLand?.id === land.id;
                return (
                  <article
                    key={land.id}
                    className={`land-card ${active ? "active" : ""}`}
                    onClick={() => handleSelect(land)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelect(land);
                      }
                    }}
                  >
                    <div className="land-card-top">
                      <span className="card-badge">{formatLandUse(getLandPrimaryUse(land))}</span>
                      <span className="land-pill">{land.areaHectares} ha</span>
                    </div>
                    <h2>{land.title}</h2>
                    <p>{land.location.province} · {land.location.district}</p>
                    <p className="land-muted">Agua: {land.water}</p>
                    <p className="land-muted">Acceso: {land.access}</p>
                    <p className="card-price">Desde ${land.priceRule.pricePerMonth}/mes</p>
                    <div className="card-actions">
                      <button className="btn btn-ghost" onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/lands/${land.id}`);
                      }}>Ver detalle</button>
                    </div>
                  </article>
                );
              })}
            </div>

            {loading ? (
              <div className="glass-panel empty-state">
                <p>Cargando terrenos...</p>
              </div>
            ) : filteredLands.length === 0 ? (
              <div className="glass-panel empty-state">
                <p>No hay terrenos para esos filtros.</p>
              </div>
            ) : null}
          </section>
        </section>
      </main>
    </div>
  );
}
