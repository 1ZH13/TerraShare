import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import type { LandDto } from "@terrashare/shared";
import { Badge, Button, Card } from "../components/ui";
import { listLands } from "../services/api";
import { isAdminUser } from "../components/authDisplay";
import "./landing.css";

// ─── Iconos inline (el app no carga el webfont Tabler del prototipo) ──────────
type IconProps = { size?: number };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function LeafIcon({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </svg>
  );
}

function MapSearchIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M11 18.5 9 20l-6-3V4l6 3 6-3 6 3v6" />
      <path d="M9 7v13M15 4v8" />
      <circle cx="18" cy="18" r="3" />
      <path d="m20.5 20.5 1.5 1.5" />
    </svg>
  );
}

function UploadIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="M7 9l5-5 5 5M12 4v12" />
    </svg>
  );
}

function ShieldIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CheckIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function LockIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function PinIcon({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function TargetIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

function EyeIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ─── Contenido estático ───────────────────────────────────────────────────────
const HOW = [
  { icon: <MapSearchIcon />, title: "Explora con mapa", desc: "Filtra por provincia, uso, área y precio." },
  { icon: <UploadIcon />, title: "Publica en minutos", desc: "Sube fotos, ubicación y condiciones." },
  { icon: <ShieldIcon />, title: "Cierra seguro", desc: "Chat, acuerdo y pago en un solo lugar." },
];

const USE_LABELS: Record<string, string> = {
  agricultura: "Agricultura",
  ganaderia: "Ganadería",
  forestal: "Forestal",
  acuicultura: "Acuicultura",
  mixto: "Mixto",
  otro: "Otro",
};

function formatUse(use?: string): string {
  if (!use) return "Terreno";
  return USE_LABELS[use] ?? use;
}

function TeaserCard({ land }: { land: LandDto }) {
  const price = land.priceRule?.pricePerMonth;
  return (
    <Link to={`/lands/${land.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <Card interactive>
        <Badge tone="green">{formatUse(land.allowedUses?.[0])}</Badge>
        <h3 className="ts-title lp-landcard__title">{land.title}</h3>
        <div className="lp-landcard__meta">
          <PinIcon />
          <span>
            {land.location?.province} · {land.area} ha
          </span>
        </div>
        <div className="lp-landcard__price">
          {typeof price === "number" ? (
            <>
              ${price.toLocaleString("es-PA")}
              <span>/mes</span>
            </>
          ) : (
            <span>Precio a consultar</span>
          )}
        </div>
      </Card>
    </Link>
  );
}

export default function LandingPage() {
  const { isSignedIn, user } = useUser();
  const admin = isAdminUser(user);
  const [lands, setLands] = useState<LandDto[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    listLands({ sort: "createdAt", order: "desc", pageSize: 2 })
      .then((data) => {
        if (!active) return;
        setLands(data.slice(0, 2));
        setStatus("ready");
      })
      .catch((err) => {
        console.error("Error cargando terrenos destacados:", err);
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const dashboardTo = admin ? "/dashboard/admin" : "/dashboard";
  const lockedTo = isSignedIn ? "/catalog" : "/register";
  const lockedCta = isSignedIn ? "Ver catálogo" : "Crear cuenta";

  const scrollToHow = () => {
    document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="lp">
      {/* Header público minimal */}
      <header className="lp-header">
        <Link to="/" className="lp-brand" aria-label="TerraShare, inicio">
          <LeafIcon size={28} />
          TerraShare
        </Link>
        <div className="lp-header-actions">
          {isSignedIn ? (
            <Link to={dashboardTo} className="ds-btn ds-btn--primary">
              {admin ? "Panel de admin" : "Mi panel"}
            </Link>
          ) : (
            <>
              <Link to="/login" className="ds-btn ds-btn--ghost">
                Iniciar sesión
              </Link>
              <Link to="/register" className="ds-btn ds-btn--primary">
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="lp-hero ts-fade-up">
        <span className="lp-hero__badge">Alquiler y venta de tierra en Panamá</span>
        <h1 className="ts-display lp-hero__title">Encuentra, publica y alquila tierra productiva</h1>
        <p className="lp-hero__subtitle">
          Conectamos a quien tiene tierra con quien la necesita. Claro, seguro y sin intermediarios.
        </p>
        <div className="lp-hero__actions">
          {isSignedIn ? (
            <Link to="/catalog" className="ds-btn ds-btn--primary ds-btn--lg">
              Explorar catálogo
            </Link>
          ) : (
            <Link to="/register" className="ds-btn ds-btn--primary ds-btn--lg">
              Crear cuenta gratis
            </Link>
          )}
          <Button variant="secondary" size="lg" onClick={scrollToHow}>
            Ver cómo funciona
          </Button>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="lp-section" id="como-funciona">
        <div className="lp-how">
          {HOW.map((item) => (
            <Card key={item.title}>
              <div className="lp-how__icon">{item.icon}</div>
              <h3 className="ts-title">{item.title}</h3>
              <p>{item.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Para quien ofrece */}
      <section className="lp-split">
        <div>
          <span className="lp-eyebrow">Para quien ofrece tierra</span>
          <h2 className="ts-title lp-split__title">Tu terreno, trabajando por ti</h2>
          <p className="lp-split__text">
            Publícalo una vez y recibe solicitudes de productores verificados. Tú decides a quién y cuándo.
          </p>
          <ul className="lp-checklist">
            <li>
              <CheckIcon /> Solicitudes ordenadas por estado
            </li>
            <li>
              <CheckIcon /> Pagos y contrato integrados
            </li>
          </ul>
        </div>
        <Card className="lp-split__media">
          <div className="lp-minilist__label">Solicitudes recibidas</div>
          <div className="lp-minirow">
            <span>Finca El Tamarindo</span>
            <Badge tone="beige">Pendiente</Badge>
          </div>
          <div className="lp-minirow">
            <span>Lote Vista Caisán</span>
            <Badge tone="green">Aprobada</Badge>
          </div>
          <div className="lp-minirow">
            <span>Parcela Río Indio</span>
            <Badge tone="neutral">Pagada</Badge>
          </div>
        </Card>
      </section>

      {/* Para quien busca */}
      <section className="lp-split lp-split--reverse">
        <Card className="lp-split__media">
          <div className="lp-minilist__label">Explora en el mapa</div>
          <div className="lp-minirow">
            <span>
              <PinIcon /> Hacienda Las Lomas
            </span>
            <span className="lp-teaser__note">$390/mes</span>
          </div>
          <div className="lp-minirow">
            <span>
              <PinIcon /> Solar El Roble
            </span>
            <span className="lp-teaser__note">$420/mes</span>
          </div>
        </Card>
        <div>
          <span className="lp-eyebrow">Para quien busca tierra</span>
          <h2 className="ts-title lp-split__title">El terreno ideal, sin dar vueltas</h2>
          <p className="lp-split__text">
            Explora en el mapa, compara condiciones reales y solicita cuando estés seguro.
          </p>
          <ul className="lp-checklist">
            <li>
              <CheckIcon /> Ubicación y área a la vista
            </li>
            <li>
              <CheckIcon /> Contacto directo con el dueño
            </li>
          </ul>
        </div>
      </section>

      {/* Stats */}
      <section className="lp-stats ts-fade-up">
        <div className="lp-stats__caption">Productores y propietarios ya confían en TerraShare</div>
        <div className="lp-stats__grid">
          <div>
            <div className="lp-stat__value">120+</div>
            <div className="lp-stat__label">Terrenos publicados</div>
          </div>
          <div>
            <div className="lp-stat__value">9</div>
            <div className="lp-stat__label">Provincias</div>
          </div>
          <div>
            <div className="lp-stat__value">2 días</div>
            <div className="lp-stat__label">Respuesta promedio</div>
          </div>
        </div>
      </section>

      {/* Teaser de terrenos */}
      <section className="lp-section">
        <div className="lp-teaser__head">
          <h2 className="ts-title">Terrenos destacados</h2>
          <span className="lp-teaser__note">Muestra pública</span>
        </div>
        <div className="lp-teaser__grid">
          {status === "loading" ? (
            <>
              <div className="lp-skeleton" />
              <div className="lp-skeleton" />
              <LockedCard to={lockedTo} cta={lockedCta} />
            </>
          ) : status === "error" || lands.length === 0 ? (
            <div className="lp-teaser__state">
              <p>
                {status === "error"
                  ? "No pudimos cargar los terrenos ahora mismo. Vuelve a intentarlo en un momento."
                  : "Aún no hay terrenos publicados. Sé el primero en publicar el tuyo."}
              </p>
            </div>
          ) : (
            <>
              {lands.map((land) => (
                <TeaserCard key={land.id} land={land} />
              ))}
              <LockedCard to={lockedTo} cta={lockedCta} />
            </>
          )}
        </div>
      </section>

      {/* Misión / Visión */}
      <section className="lp-section">
        <div className="lp-mv">
          <Card>
            <div className="lp-mv__icon">
              <TargetIcon />
            </div>
            <h3 className="ts-title">Misión</h3>
            <p>Facilitar el acceso a tierra productiva de forma simple, segura y transparente.</p>
          </Card>
          <Card>
            <div className="lp-mv__icon">
              <EyeIcon />
            </div>
            <h3 className="ts-title">Visión</h3>
            <p>Ser la plataforma de referencia para tierra rural en Centroamérica.</p>
          </Card>
        </div>
      </section>

      {/* CTA final */}
      <section className="lp-cta ts-fade-up">
        <h2 className="ts-title">¿Listo para empezar?</h2>
        <p>Únete a propietarios y productores de todo Panamá. Es gratis.</p>
        {isSignedIn ? (
          <Link to="/catalog" className="ds-btn ds-btn--primary ds-btn--lg">
            Explorar catálogo
          </Link>
        ) : (
          <Link to="/register" className="ds-btn ds-btn--primary ds-btn--lg">
            Crear cuenta gratis
          </Link>
        )}
      </section>

      {/* Footer */}
      <footer>
        <div className="lp-footer">
          <div>
            <div className="lp-footer__brand">
              <LeafIcon size={20} />
              TerraShare
            </div>
            <p className="lp-footer__tag">Tierra productiva para Panamá.</p>
          </div>
          <div className="lp-footer__col">
            <h4>Producto</h4>
            <Link to={isSignedIn ? "/catalog" : "/login"}>Catálogo</Link>
            <Link to={isSignedIn ? "/dashboard/lands" : "/login"}>Publicar</Link>
          </div>
          <div className="lp-footer__col">
            <h4>Empresa</h4>
            <a href="#como-funciona">Quiénes somos</a>
            <a href="#como-funciona">Contacto</a>
          </div>
          <div className="lp-footer__col">
            <h4>Legal</h4>
            <a href="#">Términos</a>
            <a href="#">Privacidad</a>
          </div>
        </div>
        <div className="lp-copy">TerraShare © {new Date().getFullYear()} · Hecho en Panamá</div>
      </footer>
    </div>
  );
}

function LockedCard({ to, cta }: { to: string; cta: string }) {
  return (
    <div className="lp-locked">
      <LockIcon />
      <div className="lp-locked__count">Todo el catálogo</div>
      <div className="lp-locked__hint">Inicia sesión para ver todos los terrenos</div>
      <Link to={to} className="ds-btn ds-btn--secondary ds-btn--sm">
        {cta}
      </Link>
    </div>
  );
}
