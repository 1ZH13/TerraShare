import { useState } from "react";
import { Link } from "react-router-dom";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const terrenos = [
  { id: "land-1", nombre: "Finca El Tamarindo", ubicacion: "Los Santos", uso: "Agricultura", precio: 420 },
  { id: "land-2", nombre: "Lote Vista Caisan", ubicacion: "Chiriqui", uso: "Ganaderia", precio: 560 },
  { id: "land-3", nombre: "Parcela Rio Indio", ubicacion: "Cocle", uso: "Mixto", precio: 390 },
];

const pasos = [
  { numero: "1", titulo: "Publica tu terreno", descripcion: "Registra tus terrenos con fotos y condiciones." },
  { numero: "2", titulo: "Arrendatarios exploran", descripcion: "Sin login pueden ver catalogo y filtros." },
  { numero: "3", titulo: "Solicitan y negocian", descripcion: "Envian solicitud. Tu revisas y decides." },
  { numero: "4", titulo: "Cierran el trato", descripcion: "Pago seguro y chat interno." },
];

const beneficios = [
  {
    icono: "🌱",
    titulo: "Explora sin registro",
    descripcion: "Navega el catalogo completo sin crear cuenta. Filtra por tipo, ubicacion y precio.",
  },
  {
    icono: "📋",
    titulo: "Gestion centralizada",
    descripcion: "Propietarios y arrendatarios gestionan todo desde su dashboard: solicitudes, contratos, pagos.",
  },
  {
    icono: "🔒",
    titulo: "Pagos seguros",
    descripcion: "Procesamos transacciones con Stripe. Tu dinero esta protegido hasta que ambos lados cumplan.",
  },
];

const estadisticas = [
  { valor: "120+", label: "Terrenos listados" },
  { valor: "85", label: "Propietarios activos" },
  { valor: "98%", label: "Satisfaccion" },
];

export default function LandingPage() {
  const [correo, setCorreo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const manejarLead = async (event) => {
    event.preventDefault();
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
        </nav>
        <Link className="btn btn-primary" to="/register">
          Crear cuenta
        </Link>
      </header>

      <main>
        <section className="hero">
          <div className="hero-bg" aria-hidden="true" />
          <div className="hero-content">
            <span className="hero-badge">Plataforma de alquiler en Panama</span>
            <h1 className="hero-title">
              Terrenos productivos,<br />
              alquiler sin complicaciones.
            </h1>
            <p className="hero-subtitle">
              Conectamos propietarios y arrendatarios de forma directa.
              Explora el catalogo, filtra por lo que necesitas y gestiona todo
              desde una sola plataforma.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary btn-lg" to="/register">
                Empezar ahora
              </Link>
              <Link to="/catalog" className="btn btn-outline btn-lg">
                Ver catalogo
              </Link>
            </div>
            <p className="hero-hint">Sin registro obligatorio para explorar.</p>
          </div>
        </section>

        <section className="stats-bar">
          {estadisticas.map((item) => (
            <div key={item.label} className="stat-item">
              <span className="stat-value">{item.valor}</span>
              <span className="stat-label">{item.label}</span>
            </div>
          ))}
        </section>

        <section className="panel">
          <h2 className="section-title">Por que TerraShare?</h2>
          <div className="benefits-grid">
            {beneficios.map((item) => (
              <div key={item.titulo} className="benefit-card">
                <span className="benefit-icon" aria-hidden="true">{item.icono}</span>
                <h3>{item.titulo}</h3>
                <p>{item.descripcion}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="section-header-row">
            <h2>Catalogo rapido</h2>
            <Link to="/catalog" className="btn btn-ghost">Ver todo</Link>
          </div>
          <div className="cards-grid">
            {terrenos.map((item) => (
              <article key={item.id} className="land-card">
                <p className="card-badge">{item.uso}</p>
                <h3>{item.nombre}</h3>
                <p>{item.ubicacion}</p>
                <p>Desde ${item.precio}/mes</p>
                <Link to={`/lands/${item.id}`} className="btn btn-ghost" style={{ marginTop: "0.5rem" }}>
                  Ver detalle
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2 className="section-title">Como funciona</h2>
          <div className="steps-grid">
            {pasos.map((item) => (
              <div key={item.numero} className="step-item">
                <span className="step-number">{item.numero}</span>
                <div>
                  <strong>{item.titulo}</strong>
                  <p>{item.descripcion}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel panel-accent">
          <div className="cta-block">
            <h2>Listo para arrendar o publicar?</h2>
            <p>Recibe acceso anticipado y noticias de nuevos terrenos.</p>
            <form className="cta-form" onSubmit={manejarLead}>
              <input
                type="email"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                placeholder="tu@email.com"
                required
                disabled={loading}
              />
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Recibir acceso"}
              </button>
            </form>
            {mensaje ? <p className="cta-message">{mensaje}</p> : null}
            <p className="cta-hint">
              Ya tienes cuenta? <Link to="/login">Inicia sesion</Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>&copy; {new Date().getFullYear()} TerraShare. Panama.</p>
      </footer>
    </div>
  );
}
