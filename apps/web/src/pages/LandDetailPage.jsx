import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";
import { getLandById, adaptLand } from "../services/api";

export default function LandDetailPage() {
  const { landId } = useParams();
  const navigate = useNavigate();
  const { openSignUp, isSignedIn } = useClerk();

  const [land, setLand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!landId) return;
    let active = true;
    setLoading(true);
    setError("");

    const load = async () => {
      try {
        const raw = await getLandById(landId);
        if (active) setLand(adaptLand(raw));
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [landId]);

  const handleReservar = () => {
    if (!isSignedIn) {
      navigate("/login", { state: { from: `/lands/${landId}` } });
    } else {
      navigate(`/reserve/${landId}`, { state: { land } });
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="panel" style={{ textAlign: "center", padding: "3rem" }}>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <div className="toast toast-error" style={{ marginTop: "1rem" }}>
          <strong>Error</strong>
          <p>{error}</p>
        </div>
        <Link to="/catalog" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
          Volver al catalogo
        </Link>
      </div>
    );
  }

  if (!land) return null;

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" aria-hidden="true" />
      <div className="ambient ambient-right" aria-hidden="true" />

      <header className="top-nav">
        <Link to="/" className="brand">TerraShare</Link>
        <nav className="menu">
          <Link to="/catalog">Explorar</Link>
          <Link to="/login">Iniciar sesion</Link>
        </nav>
        <button className="btn btn-primary" onClick={() => openSignUp({})}>
          Crear cuenta
        </button>
      </header>

      <main>
        <Link to="/catalog" className="btn btn-ghost" style={{ marginBottom: "1rem" }}>
          &larr; Volver al catalogo
        </Link>

        <div className="panel detail-panel">
          <div className="detail-grid">
            <div>
              <span className="card-badge">{land.type}</span>
              <h1 style={{ margin: "0.5rem 0" }}>{land.title}</h1>
              <p style={{ fontSize: "1.05rem", opacity: 0.8 }}>
                {land.province}{land.district ? `, ${land.district}` : ""}
                {land.location?.corregimiento ? `, ${land.location.corregimiento}` : ""}
              </p>

              {land.description && (
                <p style={{ marginTop: "1rem", lineHeight: 1.6 }}>{land.description}</p>
              )}
            </div>

            <div className="detail-card">
              <h2 style={{ margin: "0 0 1rem" }}>
                {land.monthlyPrice > 0 ? `$${land.monthlyPrice}` : "Precio variable"}
                {land.monthlyPrice > 0 && <span style={{ fontSize: "1rem", opacity: 0.7 }}> /mes</span>}
              </h2>
              <dl>
                <dt>Area</dt>
                <dd>{land.areaHectares} ha</dd>
                <dt>Tipo</dt>
                <dd>{land.type}</dd>
                <dt>Disponibilidad</dt>
                <dd>
                  {land.availableFrom
                    ? `Desde ${new Date(land.availableFrom).toLocaleDateString("es-PA")}`
                    : "Disponible"}
                </dd>
              </dl>
              <button
                className="btn btn-primary"
                style={{ width: "100%", marginTop: "1rem" }}
                onClick={handleReservar}
              >
                {isSignedIn ? "Solicitar este terreno" : "Iniciar sesion para solicitar"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}