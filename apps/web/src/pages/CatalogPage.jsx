import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const mockLands = [
  {
    id: "1",
    name: "Finca El Tamarindo",
    location: "Los Santos",
    use: "Agricultura",
    price: 420,
    area: "2.5 has",
    water: "Pozo y rio cercano",
    description: "Terreno fertil ideal para cultivos de ciclo corto. Cuenta con sistema de riego instalado y acceso por carretera principal.",
  },
  {
    id: "2",
    name: "Lote Vista Caisan",
    location: "Chiriqui",
    use: "Ganaderia",
    price: 560,
    area: "5 has",
    water: "Toma de quebrada",
    description: "Pasto establecido perfecto para ganado. cercas en buen estado y galpon de almacenamiento.",
  },
  {
    id: "3",
    name: "Parcela Rio Indio",
    location: "Cocle",
    use: "Mixto",
    price: 390,
    area: "3 has",
    water: "Sistema de riego",
    description: "Terreno adaptable para agricultura y ganaderia. Suelo profundo y bien drenado.",
  },
  {
    id: "4",
    name: "Hacienda Las Lomas",
    location: "Veraguas",
    use: "Agricultura",
    price: 480,
    area: "4 has",
    water: "Pozo profundo",
    description: "Terreno con buena topografia y acceso a servicios basicos. Ideal para proyectos de exportacion.",
  },
  {
    id: "5",
    name: "Solar El Roble",
    location: "Herrera",
    use: "Mixto",
    price: 350,
    area: "2 has",
    water: "Rio cercano",
    description: "Terreno pequeno pero productivo. Perfecto para pequenos productores.",
  },
];

const useFilters = ["Todos", "Agricultura", "Ganaderia", "Mixto"];

export default function CatalogPage() {
  const [filter, setFilter] = useState("Todos");
  const navigate = useNavigate();

  const filteredLands = filter === "Todos"
    ? mockLands
    : mockLands.filter((l) => l.use === filter);

  return (
    <div className="page-shell">
      <div className="glass-nav">
        <Link to="/" className="brand">TerraShare</Link>
        <nav className="menu">
          <Link to="/catalog" className="active">Terrenos</Link>
          <Link to="/login">Iniciar sesion</Link>
        </nav>
        <div className="auth-actions">
          <Link to="/register" className="btn btn-primary">Crear cuenta</Link>
        </div>
      </div>

      <main>
        <div className="section-header">
          <h1>Catalogo de Terrenos</h1>
          <p>Explora opciones sin login. Cuando estes listo, crea tu cuenta para solicitar.</p>
        </div>

        <div className="filter-bar">
          {useFilters.map((f) => (
            <button
              key={f}
              className={`filter-chip ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="cards-grid">
          {filteredLands.map((land) => (
            <Link key={land.id} to={`/lands/${land.id}`} className="land-card">
              <span className="card-badge">{land.use}</span>
              <h2>{land.name}</h2>
              <p>{land.location}</p>
              <p style={{ marginTop: "0.5rem", opacity: 0.6, fontSize: "0.85rem" }}>
                {land.area}
              </p>
              <p className="card-price">Desde ${land.price}/mes</p>
            </Link>
          ))}
        </div>

        {filteredLands.length === 0 && (
          <div className="glass-panel" style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ opacity: 0.6 }}>No hay terrenos disponibles para este filtro.</p>
          </div>
        )}
      </main>
    </div>
  );
}