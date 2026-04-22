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
        </nav>
        <button className="btn btn-primary" onClick={() => openSignUp({})}>
          Crear cuenta
        </button>
      </header>

      <main>
        {/* ── Hero ─────────────────────────────────────────────── */}
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
              <button className="btn btn-primary btn-lg" onClick={() => openSignUp({})}>
                Empezar ahora
              </button>
              <Link to="/catalog" className="btn btn-outline btn-lg">
                Ver catalogo
              </Link>
            </div>
            <p className="hero-hint">Sin registro obligatorio para explorar.</p>
          </div>
        </section>

        {/* ── Estadisticas ─────────────────────────────────────── */}
        <section className="stats-bar">
          {estadisticas.map((s) => (
            <div key={s.label} className="stat-item">
              <span className="stat-value">{s.valor}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </section>

        {/* ── Beneficios ───────────────────────────────────────── */}
        <section className="panel">
          <h2 className="section-title">Por que TerraShare?</h2>
          <div className="benefits-grid">
            {beneficios.map((b) => (
              <div key={b.titulo} className="benefit-card">
                <span className="benefit-icon" aria-hidden="true">{b.icono}</span>
                <h3>{b.titulo}</h3>
                <p>{b.descripcion}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Catalogo rapido ──────────────────────────────────── */}
        <section className="panel">
          <div className="section-header-row">
            <h2>Catalogo rapido</h2>
            <Link to="/catalog" className="btn btn-ghost">Ver todo</Link>
          </div>
          <div className="cards-grid">
            {terrenos.map((t) => (
              <article key={t.id} className="land-card">
                <p className="card-badge">{t.uso}</p>
                <h3>{t.nombre}</h3>
                <p>{t.ubicacion}</p>
                <p>Desde ${t.precio}/mes</p>
                <Link to="/catalog" className="btn btn-ghost" style={{ marginTop: "0.5rem" }}>
                  Ver detalle
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* ── Como funciona ───────────────────────────────────── */}
        <section className="panel">
          <h2 className="section-title">Como funciona</h2>
          <div className="steps-grid">
            {pasos.map((p) => (
              <div key={p.numero} className="step-item">
                <span className="step-number">{p.numero}</span>
                <div>
                  <strong>{p.titulo}</strong>
                  <p>{p.descripcion}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA email capture ───────────────────────────────── */}
        <section className="panel panel-accent">
          <div className="cta-block">
            <h2>Listo para arrendar o publicar?</h2>
            <p>Recibe acceso anticipado y noticias de nuevos terrenos.</p>
            <form className="cta-form" onSubmit={manejarLead}>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tu@email.com"
                required
                disabled={loading}
              />
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Recibir acceso"}
              </button>
            </form>
            {mensaje && <p className="cta-message">{mensaje}</p>}
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