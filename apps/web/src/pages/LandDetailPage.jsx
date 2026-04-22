import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";

const mockLands = {
  1: {
    id: "1",
    name: "Finca El Tamarindo",
    location: "Los Santos",
    use: "Agricultura",
    price: 420,
    area: "2.5 has",
    water: "Pozo y rio cercano",
    description: "Terreno fertil ideal para cultivos de ciclo corto. Cuenta con sistema de riego instalado y acceso por carretera principal.",
    features: ["Riego instalado", "Acceso vehicular", " cerca de rio", "Suelo fertil"],
  },
  2: {
    id: "2",
    name: "Lote Vista Caisan",
    location: "Chiriqui",
    use: "Ganaderia",
    price: 560,
    area: "5 has",
    water: "Toma de quebrada",
    description: "Pasto establecido perfecto para ganado. Cercas en buen estado y galpon de almacenamiento.",
    features: ["Pasto establecido", "Galpon de almacenamiento", "Cercas perimetrales", "Agua permanente"],
  },
  3: {
    id: "3",
    name: "Parcela Rio Indio",
    location: "Cocle",
    use: "Mixto",
    price: 390,
    area: "3 has",
    water: "Sistema de riego",
    description: "Terreno adaptable para agricultura y ganaderia. Suelo profundo y bien drenado.",
    features: ["Suelo profundo", "Buen drenaje", " versatile", " cerca de rio"],
  },
  4: {
    id: "4",
    name: "Hacienda Las Lomas",
    location: "Veraguas",
    use: "Agricultura",
    price: 480,
    area: "4 has",
    water: "Pozo profundo",
    description: "Terreno con buena topografia y acceso a servicios basicos. Ideal para proyectos de exportacion.",
    features: ["Topografia suave", " Acceso a servicios", "Pozo profundo", " ideal para exportacion"],
  },
  5: {
    id: "5",
    name: "Solar El Roble",
    location: "Herrera",
    use: "Mixto",
    price: 350,
    area: "2 has",
    water: "Rio cercano",
    description: "Terreno pequeno pero productivo. Perfecto para pequenos productores.",
    features: ["Peque pero productivo", " cerca de rio", "Acceso vehicular", "Flexible"],
  },
};

export default function LandDetailPage() {
  const { id } = useParams();
  const { openSignIn } = useClerk();
  const { isSignedIn } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const land = mockLands[id];

  const handleRequest = async () => {
    if (!isSignedIn) {
      openSignIn({
        redirectUrl: `/lands/${id}`,
        afterInstantiation: () => {
          navigate(`/lands/${id}`);
        },
      });
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    alert("Solicitud enviada! El propietario se contactara contigo.");
  };

  if (!land) {
    return (
      <div className="page-shell">
        <div className="glass-nav">
          <Link to="/" className="brand">TerraShare</Link>
          <nav className="menu">
            <Link to="/catalog">Terrenos</Link>
          </nav>
        </div>
        <div className="glass-panel" style={{ textAlign: "center", padding: "3rem", marginTop: "2rem" }}>
          <h1>Terreno no encontrado</h1>
          <p style={{ opacity: 0.6, marginTop: "1rem" }}>
            Este terreno no existe o fue eliminado.
          </p>
          <Link to="/catalog" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-block" }}>
            Ver catalogo
          </Link>
        </div>
      </div>
    );
  }

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
        <div style={{ marginBottom: "1.5rem" }}>
          <Link to="/catalog" className="back-link-text">
            ← Volver al catalogo
          </Link>
        </div>

        <div className="glass-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <span className="card-badge">{land.use}</span>
              <h1 style={{ marginTop: "0.5rem", marginBottom: "0", fontSize: "clamp(1.8rem, 4vw, 2.5rem)" }}>
                {land.name}
              </h1>
              <p style={{ opacity: 0.75, marginTop: "0.5rem", fontSize: "1.1rem" }}>
                {land.location}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "2rem", fontWeight: "800", color: "var(--soil-500)", margin: 0 }}>
                ${land.price}
              </p>
              <p style={{ opacity: 0.6, margin: "0.25rem 0 0" }}>por mes</p>
            </div>
          </div>

          <div className="detail-grid">
            <div>
              <h2 style={{ marginTop: 0, fontSize: "1.3rem" }}>Descripcion</h2>
              <p style={{ lineHeight: 1.7, opacity: 0.85 }}>{land.description}</p>

              <h2 style={{ marginTop: "1.5rem", fontSize: "1.3rem" }}>Caracteristicas</h2>
              <ul style={{ margin: "0.5rem 0 0", padding: 0, listStyle: "none" }}>
                {land.features.map((f) => (
                  <li key={f} style={{ padding: "0.4rem 0", borderBottom: "1px solid rgba(19,33,24,0.08)" }}>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="detail-card">
              <h2 style={{ margin: "0 0 1rem" }}>Informacion</h2>
              <dl>
                <div>
                  <dt>Area</dt>
                  <dd>{land.area}</dd>
                </div>
                <div>
                  <dt>Uso</dt>
                  <dd>{land.use}</dd>
                </div>
                <div>
                  <dt>Agua</dt>
                  <dd>{land.water}</dd>
                </div>
              </dl>

              <button
                className="btn btn-primary btn-full"
                onClick={handleRequest}
                disabled={loading}
                style={{ marginTop: "1.5rem" }}
              >
                {loading ? (
                  <span className="spinner" />
                ) : isSignedIn ? (
                  "Solicitar alquiler"
                ) : (
                  "Iniciar sesion para solicitar"
                )}
              </button>

              {!isSignedIn && (
                <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", opacity: 0.6, textAlign: "center" }}>
                  o{" "}
                  <Link to="/register" style={{ color: "var(--leaf-700)", fontWeight: 700 }}>
                    crea tu cuenta
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}