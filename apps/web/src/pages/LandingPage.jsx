import { useState } from "react";
import { Link } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";

const metrics = [
  { value: "+120", label: "Terrenos verificados" },
  { value: "<48h", label: "Tiempo promedio de respuesta" },
  { value: "6", label: "Provincias cubiertas" },
];

const benefits = [
  {
    icon: "📊",
    title: "Información estandarizada",
    desc: "Cada terreno tiene datos completos: agua, acceso, uso permitido y disponibilidad. Sin sorpresas.",
  },
  {
    icon: "🔍",
    title: "Búsqueda transparente",
    desc: "Filtros por tipo de suelo, provincia y precio. Explora sin login, activa tu cuenta para solicitar.",
  },
  {
    icon: "⚡",
    title: "Decisión en menos de 48h",
    desc: "Flujo rápido de solicitud a aprobación. Notificaciones en cada cambio de estado.",
  },
  {
    icon: "🔒",
    title: "Trazabilidad completa",
    desc: "Registro de todas las acciones. Contratos claros, pagos seguros y historial para ambas partes.",
  },
];

const featuredLands = [
  {
    id: "1",
    name: "Finca El Tamarindo",
    location: "Los Santos",
    use: "Agricultura",
    price: 420,
    size: "5.2 Ha",
    water: "Pozo y río cercano",
    access: "Carroable todo el año",
  },
  {
    id: "2",
    name: "Lote Vista Caisan",
    location: "Chiriquí",
    use: "Ganadería",
    price: 560,
    size: "12 Ha",
    water: "Toma de quebrada",
    access: "Entrada principal paved",
  },
  {
    id: "3",
    name: "Parcela Río Indio",
    location: "Coclé",
    use: "Mixto",
    price: 390,
    size: "3.8 Ha",
    water: "Sistema de riego",
    access: "Camino rural",
  },
];

const steps = [
  { number: "1", title: "Publica tu terreno", desc: "Crea tu perfil y registra tus terrenos con fotos, ubicación y condiciones." },
  { number: "2", title: "Exploran sin login", desc: "Los arrendatarios revisan el catálogo, filtros y detalles. Sin compromiso." },
  { number: "3", title: "Reciben solicitudes", desc: "Revisa cada solicitud, pide info adicional si es necesario y decide." },
  { number: "4", title: "Cierran el trato", desc: "Firman acuerdo, procesan pago seguro y coordinan por chat interno." },
];

export default function LandingPage() {
  const { openSignIn, openSignUp } = useClerk();
  const [email, setEmail] = useState("");
  const [ctaMessage, setCtaMessage] = useState("");
  const [ctaLoading, setCtaLoading] = useState(false);

  const handleSignIn = () => openSignIn({ redirectUrl: "/dashboard" });
  const handleSignUp = () => openSignUp({ redirectUrl: "/dashboard" });

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const handleCtaSubmit = async (e) => {
    e.preventDefault();
    if (!email.includes("@") || !email.includes(".")) {
      setCtaMessage("Ingresa un correo válido para continuar.");
      return;
    }

    setCtaLoading(true);
    setCtaMessage("");

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing" }),
      });

      if (res.ok) {
        setCtaMessage("Listo. Te contactaremos pronto.");
        setEmail("");
      } else {
        const data = await res.json();
        if (data.error?.code === "CONFLICT") {
          setCtaMessage("Este correo ya está registrado. Intenta iniciar sesión.");
        } else {
          setCtaMessage("Algo salió mal. Intenta de nuevo.");
        }
      }
    } catch {
      setCtaMessage("Error de conexión. Verifica tu red e intenta de nuevo.");
    } finally {
      setCtaLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" aria-hidden="true" />
      <div className="ambient ambient-right" aria-hidden="true" />
      <div className="ambient ambient-bottom" aria-hidden="true" />

      <nav className="glass-nav">
        <Link to="/" className="brand">TerraShare</Link>
        <nav className="menu">
          <Link to="/catalog">Terrenos</Link>
          <button className="text-btn" onClick={handleSignIn}>Iniciar sesión</button>
        </nav>
        <div className="auth-actions">
          <button className="btn btn-primary" onClick={handleSignUp}>Crear cuenta</button>
        </div>
      </nav>

      <main>
        <section className="hero-section">
          <div className="hero-wrapper">
            <div className="landing-hero-copy">
              <span className="landing-hero-tag">Plataforma para Panamá</span>
              <h1 className="landing-hero-title">
                Terrenos productivos<br />
                <span className="landing-hero-title-accent">a tu alcance</span>
              </h1>
              <p className="landing-hero-subtitle">
                Conectamos propietarios con arrendatarios de forma clara y segura.
                Explora el catálogo sin login, solicita cuando estés listo.
              </p>
              <div className="landing-hero-actions">
                <button className="btn btn-primary btn-lg" onClick={handleSignUp}>
                  Publicar mi terreno
                </button>
                <Link to="/catalog" className="btn btn-ghost btn-lg">
                  Ver catálogo
                </Link>
              </div>
              <div className="landing-hero-metrics">
                {metrics.map((m) => (
                  <div key={m.label} className="landing-metric-card">
                    <span className="landing-metric-value">{m.value}</span>
                    <span className="landing-metric-label">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <div className="visual-card visual-main">
                <div className="visual-badge">Destacado</div>
                <h3>Finca El Tamarindo</h3>
                <p className="visual-location">Los Santos • Agricultura</p>
                <div className="visual-details">
                  <span>5.2 Ha</span>
                  <span>Pozo + Río</span>
                  <span>Carroable</span>
                </div>
                <div className="visual-price">$420/mes</div>
              </div>
              <div className="visual-card visual-secondary">
                <div className="visual-badge secondary">Disponible</div>
                <p>Lote Vista Caisan</p>
                <span className="visual-price-sm">$560/mes</span>
              </div>
              <div className="visual-card visual-tertiary">
                <div className="visual-badge tertiary">Mixto</div>
                <p>Parcela Río Indio</p>
                <span className="visual-price-sm">$390/mes</span>
              </div>
            </div>
          </div>
        </section>

        <section className="why-section">
          <div className="section-header center">
            <span className="kicker">¿Por qué TerraShare?</span>
            <h2>El alquiler de tierras productivas, simplificado</h2>
            <p>Construimos esta plataforma para resolver los problemas que hacen difícil el alquiler de tierras en Panamá.</p>
          </div>
          <div className="benefits-grid">
            {benefits.map((b, i) => (
              <div key={b.title} className="benefit-card" style={{ animationDelay: `${i * 80}ms` }}>
                <span className="benefit-icon">{b.icon}</span>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="preview-section">
          <div className="section-header center">
            <h2>Terrenos disponibles ahora</h2>
            <p>Explora opciones verificadas en las principales provinciasproductivas de Panamá.</p>
          </div>
          <div className="cards-grid lands-grid">
            {featuredLands.map((land) => (
              <Link key={land.id} to={`/lands/${land.id}`} className="land-card-full">
                <div className="land-card-header">
                  <span className="card-badge">{land.use}</span>
                  <span className="card-size">{land.size}</span>
                </div>
                <h3>{land.name}</h3>
                <p className="land-location">{land.location}</p>
                <div className="land-features">
                  <span>💧 {land.water}</span>
                  <span>🚜 {land.access}</span>
                </div>
                <div className="card-footer">
                  <span className="card-price">${land.price}<span>/mes</span></span>
                </div>
              </Link>
            ))}
          </div>
          <div className="preview-cta">
            <Link to="/catalog" className="btn btn-ghost">
              Ver todos los terrenos
            </Link>
          </div>
        </section>

        <section className="how-section">
          <div className="section-header center">
            <h2>Cómo funciona</h2>
            <p>Cuatro pasos simples para arrendatar o publicar</p>
          </div>
          <div className="steps-grid">
            {steps.map((step, i) => (
              <div key={step.number} className="step-card" style={{ animationDelay: `${i * 100}ms` }}>
                <span className="step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-box">
            <div className="cta-content">
              <h2>¿Listo para empezar?</h2>
              <p>Deja tu correo y te enviamos el enlace para activar tu cuenta en TerraShare.</p>
              <form className="cta-form" onSubmit={handleCtaSubmit}>
                <div className="cta-input-group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@empresa.com"
                    required
                    disabled={ctaLoading}
                  />
                  <button type="submit" className="btn btn-primary" disabled={ctaLoading}>
                    {ctaLoading ? "Enviando..." : "Recibir acceso"}
                  </button>
                </div>
                {ctaMessage && (
                  <p className={`cta-message ${ctaMessage.includes("Error") || ctaMessage.includes("mal") || ctaMessage.includes("Intenta") ? "error" : ""}`}>
                    {ctaMessage}
                  </p>
                )}
              </form>
              <p className="cta-alt">
                ¿Ya tienes cuenta?{" "}
                <button type="button" className="text-btn" onClick={handleSignIn}>
                  Iniciar sesión
                </button>
              </p>
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <div className="footer-grid">
            <div className="footer-brand">
              <span className="brand">TerraShare</span>
              <p>Plataforma de alquiler de terrenos productivos en Panamá.</p>
            </div>
            <div className="footer-links">
              <Link to="/catalog">Terrenos</Link>
              <button className="text-btn" onClick={handleSignIn}>Iniciar sesión</button>
              <button className="text-btn" onClick={handleSignUp}>Crear cuenta</button>
            </div>
          </div>
          <div className="footer-legal">
            <p>© {new Date().getFullYear()} TerraShare. Todos los derechos reservados.</p>
            <div className="footer-legal-links">
              <a href="#">Términos</a>
              <a href="#">Privacidad</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
