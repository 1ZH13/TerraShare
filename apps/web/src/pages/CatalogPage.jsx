import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listLands } from "../services/api";
import PanamaMap from "../components/PanamaMap";



export default function CatalogPage() {
  const navigate = useNavigate();
  const [type, setType] = useState("Todos");
  const [province, setProvince] = useState("Todas");
  const [maxPrice, setMaxPrice] = useState(1500);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [lands, setLands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLands = async () => {
      try {
        const data = await listLands();
        setLands(data || []);
      } catch (err) {
        console.error("Error fetching lands:", err);
      }
      setLoading(false);
    };
    fetchLands();
  }, []);

  const filteredLands = useMemo(() => {
    return lands.filter((land) => {
      const landType = land.allowedUses?.[0] || land.type || "otro";
      const price = land.priceRule?.pricePerMonth || 0;
      const matchesType = type === "Todos" || landType === type;
      const matchesProvince = province === "Todas" || land.location?.province === province;
      const matchesPrice = price <= maxPrice;
      const haystack = [land.title, land.location?.province, land.location?.district, land.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !query || haystack.includes(query.toLowerCase());
      return matchesType && matchesProvince && matchesPrice && matchesQuery;
    });
  }, [lands, type, province, maxPrice, query]);

  const USE_FILTERS = useMemo(() => ["Todos", ...new Set(lands.map((l) => l.allowedUses?.[0] || l.type).filter(Boolean))], [lands]);
  const PROVINCE_FILTERS = useMemo(() => ["Todas", ...new Set(lands.map((l) => l.location?.province).filter(Boolean))], [lands]);

  const selectedLand = filteredLands.find((l) => l.id === selectedId) || filteredLands[0];

  const handlePinClick = (land) => setSelectedId(land.id);

  return (
    <div className="page-shell">
      <main>
        <div className="section-header">
          <p className="kicker">Catálogo</p>
          <h1>Terrenos Disponibles</h1>
          <p>Explora y encuentra el terreno perfecto en Panama.</p>
        </div>

        <section className="catalog-workspace glass-panel">
          <aside className="catalog-map-panel">
            <div className="section-header compact">
              <h1>Mapa</h1>
              <p>Vista geográfica</p>
            </div>
            <PanamaMap
              lands={filteredLands}
              selectedLand={selectedLand}
              onSelectLand={(land) => setSelectedId(land.id)}
            />
          </aside>

          <section className="catalog-list-panel">
            <div className="catalog-filters glass-card">
              <div className="filters-grid">
                <label>
                  Buscar
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Provincia, uso..." />
                </label>
                <label>
                  Uso
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    {USE_FILTERS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </label>
                <label>
                  Provincia
                  <select value={province} onChange={(e) => setProvince(e.target.value)}>
                    {PROVINCE_FILTERS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </label>
                <label>
                  Precio máximo
                  <input type="range" min="300" max="1500" step="50" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} />
                  <span className="range-value">${maxPrice}</span>
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
                    onClick={() => setSelectedId(land.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="land-card-top">
                      <span className="card-badge">{land.allowedUses?.[0]}</span>
                      <span className="land-pill">{land.area} ha</span>
                    </div>
                    <h2>{land.title}</h2>
                    <p>{land.location?.province} · {land.location?.district}</p>
                    <p className="land-muted">Agua: {land.water || "No especificado"}</p>
                    <p className="land-muted">Acceso: {land.access || "No especificado"}</p>
                    <p className="card-price">${land.priceRule?.pricePerMonth}/mes</p>
                    <div className="card-actions">
                      <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); navigate(`/lands/${land.id}`); }}>
                        Ver detalle
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {loading ? (
              <div className="glass-panel empty-state"><p>Cargando...</p></div>
            ) : filteredLands.length === 0 ? (
              <div className="glass-panel empty-state"><p>No hay terrenos para esos filtros.</p></div>
            ) : null}
          </section>
        </section>
      </main>
    </div>
  );
}