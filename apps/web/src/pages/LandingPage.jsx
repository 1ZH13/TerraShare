import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import PublicHeader from "../components/PublicHeader";
import { listLands } from "../services/api";
import { isAdminUser } from "../components/authDisplay";

const metrics = [
  { value: "+120", label: "Terrenos disponibles" },
  { value: "2 días", label: "Tiempo promedio de respuesta" },
  { value: "6", label: "Provincias en Panamá" },
];

const benefits = [
  {
    icon: "📊",
    title: "Información completa",
    desc: "Tamaño exacto, fuentes de agua, acceso y precio mensual.",
  },
  {
    icon: "🔍",
    title: "Explora sin registro",
    desc: "Navega el catálogo completo antes de registrarte.",
  },
  {
    icon: "⚡",
    title: "Respuesta rápida",
    desc: "Te notificamos por email cuando el propietario responda.",
  },
  {
    icon: "📋",
    title: "Historial guardado",
    desc: "Solicitudes, mensajes y acuerdos en un solo lugar.",
  },
];

const steps = [
  { number: "1", title: "Regístrate", desc: "Con tu email en menos de 1 minuto." },
  { number: "2", title: "Publica o busca", desc: "Sube fotos de tu terreno o explora el catálogo." },
  { number: "3", title: "Recibe ofertas", desc: "Los interesados te contactan." },
  { number: "4", title: "Cierran el trato", desc: "Acuerdan fechas y formalizan." },
];

export default function LandingPage() {
  const { isSignedIn, user } = useUser();
  const admin = isAdminUser(user);
  const [activeTab, setActiveTab] = useState("benefits");
  const [featuredLands, setFeaturedLands] = useState([]);
  const [landsLoading, setLandsLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedLands = async () => {
      try {
        const lands = await listLands({ sort: "createdAt", order: "desc", pageSize: 3 });
        setFeaturedLands(lands.slice(0, 3));
      } catch (err) {
        console.error("Error fetching featured lands:", err);
      } finally {
        setLandsLoading(false);
      }
    };
    fetchFeaturedLands();
  }, []);

  const primaryAction = isSignedIn
    ? { to: admin ? "/dashboard/admin" : "/catalog", label: admin ? "Ir al dashboard admin" : "Explorar catálogo" }
    : { to: "/register", label: "Publicar mi terreno" };

  const secondaryAction = isSignedIn
    ? { to: "/catalog", label: "Ver catálogo" }
    : { to: "/login", label: "Iniciar sesión" };

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" aria-hidden="true" />
      <div className="ambient ambient-right" aria-hidden="true" />
      <div className="ambient ambient-bottom" aria-hidden="true" />

      <PublicHeader />

      <main>
        <section className="hero-section">
          <div className="hero-wrapper">
            <div className="landing-hero-copy">
              <span className="landing-hero-tag">Plataforma #1 en Panamá</span>
              <h1 className="landing-hero-title">
                Encuentra el terreno perfecto
                <br />
                <span className="landing-hero-title-accent">para producir</span>
              </h1>
              <p className="landing-hero-subtitle">
                Conectamos propietarios y productores de forma clara y segura. 
                Explora el catálogo sin registrarte. Solicita cuando estés seguro.
              </p>
              <div className="landing-hero-actions">
                <Link to={primaryAction.to} className="btn btn-primary btn-lg">
                  {primaryAction.label}
                </Link>
                <Link to={secondaryAction.to} className="btn btn-ghost btn-lg">
                  {secondaryAction.label}
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

<section className="features-section">
          <div className="section-header">
            <span className="kicker">Todo lo que necesitas</span>
            <h2>Explora, publica y conecta</h2>
            <p>Una plataforma diseñada para que alquilar tierras sea simple y seguro.</p>
          </div>
          
          <div className="features-tabs">
            <button 
              className={`tab-btn ${activeTab === 'benefits' ? 'active' : ''}`}
              onClick={() => setActiveTab('benefits')}
            >
              Beneficios
            </button>
            <button 
              className={`tab-btn ${activeTab === 'how' ? 'active' : ''}`}
              onClick={() => setActiveTab('how')}
            >
              Cómo funciona
            </button>
          </div>

          <div className="features-grid">
            {activeTab === 'benefits' ? (
              benefits.map((b, i) => (
                <div key={b.title} className="feature-card" style={{ animationDelay: `${i * 80}ms` }}>
                  <span className="feature-icon">{b.icon}</span>
                  <h3>{b.title}</h3>
                  <p>{b.desc}</p>
                </div>
              ))
            ) : (
              steps.map((step, i) => (
                <div key={step.number} className="feature-card" style={{ animationDelay: `${i * 80}ms` }}>
                  <span className="step-badge">{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="preview-section">
          <div className="section-header">
            <h2>Terrenos disponibles ahora</h2>
            <p>Explora las mejores opciones en las zonas agrícolas de Panamá.</p>
          </div>
          <div className="cards-grid lands-grid">
            {landsLoading ? (
              <p style={{ gridColumn: "1/-1", textAlign: "center", opacity: 0.6 }}>Cargando terrenos...</p>
            ) : featuredLands.length === 0 ? (
              <p style={{ gridColumn: "1/-1", textAlign: "center", opacity: 0.6 }}>No hay terrenos disponibles aún.</p>
            ) : (
              featuredLands.map((land) => (
                <Link key={land.id} to={`/lands/${land.id}`} className="land-card-full">
                  <div className="land-card-header">
                    <span className="card-badge">{land.allowedUses?.[0] || land.type}</span>
                    <span className="card-size">{land.areaHectares || land.area} ha</span>
                  </div>
                  <h3>{land.title}</h3>
                  <p className="land-location">{land.location?.province}</p>
                  <div className="land-features">
                    <span>💧 {land.water}</span>
                    <span>🚜 {land.access}</span>
                  </div>
                  <div className="card-footer">
                    <span className="card-price">${land.priceRule?.pricePerMonth || land.monthlyPrice}<span>/mes</span></span>
                  </div>
                </Link>
              ))
            )}
          </div>
          <div className="preview-cta">
            <Link to="/catalog" className="btn btn-ghost">
              Ver todos los terrenos →
            </Link>
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-box">
            <div className="cta-content">
              <h2>¿Listo para empezar?</h2>
              <p>
                {isSignedIn 
                  ? "Explora más terrenos disponibles o gestiona los tuyos desde el dashboard." 
                  : "Únete a propietarios y productores de todo Panamá. Es gratis."}
              </p>
              <div className="cta-actions">
                <Link to="/catalog" className="btn btn-ghost btn-lg">Ver terrenos</Link>
                {isSignedIn ? (
                  <Link to={admin ? "/dashboard/admin" : "/dashboard"} className="btn btn-primary btn-lg">
                    {admin ? "Panel de Admin" : "Mi Dashboard"}
                  </Link>
                ) : (
                  <Link to="/register" className="btn btn-primary btn-lg">Crear cuenta gratis</Link>
                )}
              </div>
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <div className="footer-grid">
            <div className="footer-brand">
              <span className="brand">TerraShare</span>
              <p>La plataforma #1 para alquilar tierras productivas en Panamá.</p>
            </div>
            <div className="footer-links">
              <Link to="/catalog">Catálogo</Link>
              {isSignedIn ? (
                <Link to={admin ? "/dashboard/admin" : "/dashboard"} className="text-btn">
                  {admin ? "Admin" : "Mi cuenta"}
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-btn">Entrar</Link>
                  <Link to="/register" className="text-btn">Registrarse</Link>
                </>
              )}
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
