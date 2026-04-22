import { useState } from "react";
import { Link } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const terrenos = [
  { id: 1, nombre: "Finca El Tamarindo", ubicacion: "Los Santos", uso: "Agricultura", precio: 420 },
  { id: 2, nombre: "Lote Vista Caisan", ubicacion: "Chiriqui", uso: "Ganaderia", precio: 560 },
  { id: 3, nombre: "Parcela Rio Indio", ubicacion: "Cocle", uso: "Mixto", precio: 390 },
];

const pasos = [
  { numero: "1", titulo: "Publica tu terreno", descripcion: "Registra tus terrenos con fotos y condiciones." },
  { numero: "2", titulo: "Arrendatarios exploran", descripcion: "Sin login pueden ver catalogo y filtros." },
  { numero: "3", titulo: "Solicitan y negocian", descripcion: "Envian solicitud. Tu revisas y decides." },
  { numero: "4", titulo: "Cierran el trato", descripcion: "Pago seguro y chat interno." },
];

export default function LandingPage() {
  const { openSignUp } = useClerk();
  const [correo, setCorreo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const manejarLead = async (e) => {
    e.preventDefault();
    if (!correo.includes("@")) {
      setMensaje("Ingresa un correo valido.");
      return;
    }
    setLoading(true);
    try {
      await fetch(`${apiBaseUrl}/api/v1/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: correo, source: "landing" }),
      });
      setMensaje("Te contactaremos pronto.");
      setCorreo("");
    } catch {
      setMensaje("Error de conexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" aria-hidden="true" />
      <div className="ambient ambient-right" aria-hidden="true" />

      <header className="top-nav">
        <Link to="/" className="brand">TerraShare</Link>
        <nav className="menu">
          <Link to="/catalog">Explorar</Link>
          <Link to="/login">Iniciar sesion</Link>
          <button className="btn btn-primary" onClick={() => openSignUp({})}>
            Crear cuenta
          </button>
        </nav>
      </header>

      <main>
        <section style={{ textAlign: "center", padding: "4rem 0" }}>
          <h1>Encuentra o publica terrenos productivos en Panama.</h1>
          <p style={{ maxWidth: "60ch", margin: "1rem auto" }}>
            Conectamos propietarios y arrendatarios con informacion clara.
            Explora sin login, activa tu cuenta cuando estes listo.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1.5rem" }}>
            <button className="btn btn-primary" onClick={() => openSignUp({})}>
              Empezar ahora
            </button>
            <Link to="/catalog" className="btn btn-ghost">
              Ver catalogo
            </Link>
          </div>
        </section>

        <section className="panel">
          <h2>Catalogo rapido</h2>
          <div className="cards-grid">
            {terrenos.map((t) => (
              <article key={t.id} className="land-card">
                <p className="card-badge">{t.uso}</p>
                <h2>{t.nombre}</h2>
                <p>{t.ubicacion}</p>
                <p>Desde ${t.precio}/mes</p>
                <Link to={`/catalog`} className="btn btn-ghost" style={{ marginTop: "0.5rem" }}>
                  Ver detalle
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="panel" style={{ marginTop: "1.5rem" }}>
          <h2>Como funciona</h2>
          <ol style={{ paddingLeft: "1.5rem", marginTop: "1rem" }}>
            {pasos.map((p) => (
              <li key={p.numero} style={{ marginBottom: "0.75rem" }}>
                <strong>{p.numero}. {p.titulo}</strong> - {p.descripcion}
              </li>
            ))}
          </ol>
        </section>

        <section className="panel" style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <h2>Activa tu cuenta</h2>
          <form onSubmit={manejarLead} style={{ marginTop: "1rem" }}>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tu@email.com"
              required
              disabled={loading}
              style={{ maxWidth: "300px" }}
            />
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Recibir acceso"}
            </button>
          </form>
          {mensaje && <p style={{ marginTop: "0.5rem" }}>{mensaje}</p>}
        </section>
      </main>

      <footer style={{ marginTop: "3rem", paddingTop: "1rem", borderTop: "1px solid rgba(19,33,24,0.1)", textAlign: "center", opacity: 0.6 }}>
        <p>&copy; {new Date().getFullYear()} TerraShare.</p>
      </footer>
    </div>
  );
}