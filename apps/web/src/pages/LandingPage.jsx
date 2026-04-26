import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import PublicHeader from "../components/PublicHeader";
import { listLands } from "../services/api";
import { isAdminUser } from "../components/authDisplay";

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

const steps = [
  { number: "1", title: "Publica tu terreno", desc: "Crea tu perfil y registra tus terrenos con fotos, ubicación y condiciones." },
  { number: "2", title: "Exploran sin login", desc: "Los arrendatarios revisan el catálogo, filtros y detalles. Sin compromiso." },
  { number: "3", title: "Reciben solicitudes", desc: "Revisa cada solicitud, pide info adicional si es necesario y decide." },
  { number: "4", title: "Cierran el trato", desc: "Firman acuerdo, procesan pago seguro y coordinan por chat interno." },
];

export default function LandingPage() {
  const { isSignedIn, user } = useUser();
  const admin = isAdminUser(user);
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
              <span className="landing-hero-tag">Plataforma para Panamá</span>
              <h1 className="landing-hero-title">
                Terrenos productivos
                <br />
                <span className="landing-hero-title-accent">a tu alcance</span>
              </h1>
              <p className="landing-hero-subtitle">
                Conectamos propietarios con arrendatarios de forma clara y segura.
                Explora el catálogo sin login, solicita cuando estés listo.
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
              <h2>Listo para explorar o publicar</h2>
              <p>{isSignedIn ? "Tu sesión está activa. Sigue explorando o entra al panel admin." : "Si ya tienes cuenta, entra al dashboard admin. Si no, crea una y empieza a publicar."}</p>
              <div className="cta-actions">
                <Link to="/catalog" className="btn btn-ghost btn-lg">Ver catálogo</Link>
                {isSignedIn ? (
                  <Link to={admin ? "/dashboard/admin" : "/catalog"} className="btn btn-primary btn-lg">
                    {admin ? "Ir al dashboard admin" : "Seguir explorando"}
                  </Link>
                ) : (
                  <Link to="/login" className="btn btn-primary btn-lg">Iniciar sesión</Link>
                )}
              </div>
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
              {isSignedIn ? (
                <Link to={admin ? "/dashboard/admin" : "/catalog"} className="text-btn">
                  {admin ? "Dashboard admin" : "Seguir explorando"}
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-btn">Iniciar sesión</Link>
                  <Link to="/register" className="text-btn">Crear cuenta</Link>
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
