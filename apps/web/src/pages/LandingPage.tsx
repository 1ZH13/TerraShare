import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useUser } from "@clerk/clerk-react";
import type { LandDto, LandUse } from "@terrashare/shared";
import {
  Sprout,
  ArrowRight,
  Droplets,
  ShieldCheck,
  Waves,
  Handshake,
  BadgeCheck,
  MapPin,
  Quote,
} from "lucide-react";
import { FarmlandCard, FarmlandHero } from "../components/illustrations/FarmlandScene";
import { listLands, photoSrc } from "../services/api";
import { monthlyPrice } from "../lib/land-price";
import { isAdminUser } from "../components/authDisplay";
import ThemeToggle from "../components/ThemeToggle";
import "./landing.css";

// ─── Contenido estático (fiel al prototipo) ───────────────────────────────────
const USE_LABELS: Record<LandUse, string> = {
  agricultura: "Agricultura",
  ganaderia: "Ganadería",
  forestal: "Forestal",
  acuicultura: "Acuicultura",
  mixto: "Mixto",
  otro: "Otro",
};

const BENEFITS = [
  { icon: ShieldCheck, title: "Información verificada", desc: "Área, uso y linderos revisados." },
  { icon: Waves, title: "Agua y acceso", desc: "Fuentes y vías confirmadas." },
  { icon: Handshake, title: "Trato directo", desc: "Hablas con el dueño real." },
  { icon: BadgeCheck, title: "Sin comisiones", desc: "Explora y solicita gratis." },
];

const STEPS = [
  { num: "01", title: "Explora", desc: "Filtra por provincia, uso y presupuesto en el mapa." },
  { num: "02", title: "Solicita", desc: "Envía tu interés al propietario en un clic." },
  { num: "03", title: "Acuerda", desc: "Negocia fechas y condiciones por chat." },
  { num: "04", title: "Produce", desc: "Empieza a trabajar tu nueva tierra." },
];

// Ejemplos del prototipo — se usan como respaldo si aún no hay terrenos publicados.
type FeaturedCard = {
  id: string;
  title: string;
  use: string;
  area: number;
  province: string;
  price: number | null;
  to: string;
  cover?: string;
};

const SAMPLE_FEATURED: FeaturedCard[] = [
  { id: "s1", title: "Finca El Tamarindo", use: "Ganadería", area: 5.2, province: "Los Santos", price: 420, to: "/catalog" },
  { id: "s2", title: "Lote Vista Caisán", use: "Agricultura", area: 8.0, province: "Chiriquí", price: 560, to: "/catalog" },
  { id: "s3", title: "Parcela Río Indio", use: "Mixto", area: 6.4, province: "Coclé", price: 390, to: "/catalog" },
];

function toFeatured(land: LandDto): FeaturedCard {
  return {
    id: land.id,
    title: land.title,
    use: USE_LABELS[land.allowedUses?.[0]] ?? "Terreno",
    area: land.area,
    province: land.location?.province ?? "Panamá",
    // Solo la renta: las tarjetas de la landing muestran «$X/mes» (#365).
    price: monthlyPrice(land),
    to: `/lands/${land.id}`,
    cover: land.photos?.[0] ? photoSrc(land.photos[0]) : undefined,
  };
}

function LandCard({ card }: { card: FeaturedCard }) {
  return (
    <Link to={card.to} className="lp-card">
      {card.cover ? (
        <div className="lp-card__photo lp-photo--img">
          <img src={card.cover} alt={card.title} loading="lazy" />
        </div>
      ) : (
        <FarmlandCard className="lp-art lp-card__photo" />
      )}
      <div className="lp-card__body">
        <div className="lp-card__top">
          <span className="lp-card__badge">{card.use}</span>
          <span className="lp-card__area">{card.area} ha</span>
        </div>
        <h3 className="lp-card__title">{card.title}</h3>
        <div className="lp-card__loc">
          <MapPin size={14} /> {card.province}
        </div>
        <div className="lp-card__foot">
          <span className="lp-card__price">
            {typeof card.price === "number" ? (
              <>
                ${card.price.toLocaleString("es-PA")}
                <span>/mes</span>
              </>
            ) : (
              "A consultar"
            )}
          </span>
          <span className="lp-card__go">
            <ArrowRight size={16} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function LandingPage() {
  const { isSignedIn, user } = useUser();
  const admin = isAdminUser(user);
  const [featured, setFeatured] = useState<FeaturedCard[]>(SAMPLE_FEATURED);

  useEffect(() => {
    let active = true;
    listLands({ sort: "createdAt", order: "desc", pageSize: 3 })
      .then((data) => {
        if (!active || data.length === 0) return;
        setFeatured(data.slice(0, 3).map(toFeatured));
      })
      .catch((err) => {
        console.error("Error cargando terrenos destacados:", err);
      });
    return () => {
      active = false;
    };
  }, []);

  const catalogTo = isSignedIn ? "/catalog" : "/register";
  const publishTo = isSignedIn ? (admin ? "/dashboard/admin" : "/dashboard/lands") : "/register";

  return (
    <div className="lp">
      <a href="#contenido" className="ts-skip-link">Saltar al contenido</a>
      {/* ── 01 · Header ─────────────────────────────────────────────── */}
      <nav className="lp-nav">
        <Link to="/" className="lp-brand" aria-label="TerraShare, inicio">
          <span className="lp-brand__mark">
            <Sprout size={30} strokeWidth={1.8} />
          </span>
          <span className="lp-brand__name">TerraShare</span>
        </Link>
        <div className="lp-nav__links">
          <Link to={catalogTo} className="lp-nav__link">
            Catálogo
          </Link>
          <a href="#como-funciona" className="lp-nav__link">
            Cómo funciona
          </a>
          {isSignedIn ? (
            <Link to={admin ? "/dashboard/admin" : "/dashboard"} className="lp-nav__link lp-nav__link--accent">
              Mi panel
            </Link>
          ) : (
            <Link to="/login" className="lp-nav__link lp-nav__link--accent">
              Iniciar sesión
            </Link>
          )}
          <ThemeToggle className="lp-nav__theme" />
          <Link to={publishTo} className="lp-nav__cta">
            Publicar terreno
          </Link>
        </div>
      </nav>

      <main id="contenido">
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <header className="lp-hero">
        <div>
          <div className="lp-eyebrow lp-up">
            <Sprout size={16} strokeWidth={2} /> Tierras productivas en Panamá
          </div>
          <h1 className="lp-hero__title lp-up-1">
            Tierra fértil
            <br />
            para quienes la
            <br />
            saben <em>trabajar</em>.
          </h1>
          <p className="lp-hero__lede lp-up-2">
            Conectamos a ganaderos y agricultores con dueños de tierra en toda Panamá. Explora, compara
            agua y acceso, y solicita — sin intermediarios ni comisiones ocultas.
          </p>
          <div className="lp-hero__actions lp-up-3">
            <Link to={catalogTo} className="lp-btn lp-btn--primary">
              Explorar catálogo <ArrowRight size={18} />
            </Link>
            <a href="#como-funciona" className="lp-btn lp-btn--ghost">
              Ver cómo funciona
            </a>
          </div>
          <div className="lp-herostats lp-up-4">
            <div>
              <div className="lp-herostat__value">+120</div>
              <div className="lp-herostat__label">terrenos activos</div>
            </div>
            <div className="lp-herostat__rule" />
            <div>
              <div className="lp-herostat__value">6</div>
              <div className="lp-herostat__label">provincias</div>
            </div>
            <div className="lp-herostat__rule" />
            <div>
              <div className="lp-herostat__value">2 días</div>
              <div className="lp-herostat__label">respuesta prom.</div>
            </div>
          </div>
        </div>
        <div className="lp-heroart">
          <FarmlandHero className="lp-art lp-heroart__photo" />
          <div className="lp-chip lp-chip--water">
            <span className="lp-chip--water__icon">
              <Droplets size={21} />
            </span>
            <div>
              <div className="lp-chip--water__k">Agua confirmada</div>
              <div className="lp-chip--water__v">Pozo + Río</div>
            </div>
          </div>
          <div className="lp-chip lp-chip--price">
            <div className="lp-chip--price__k">Desde</div>
            <div className="lp-chip--price__v">
              $420<span>/mes</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Banda de beneficios ─────────────────────────────────────── */}
      <section className="lp-band">
        {BENEFITS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="lp-band__cell">
            <span className="lp-band__icon">
              <Icon size={27} strokeWidth={1.6} />
            </span>
            <div>
              <div className="lp-band__title">{title}</div>
              <div className="lp-band__desc">{desc}</div>
            </div>
          </div>
        ))}
      </section>

      {/* ── Terrenos destacados ─────────────────────────────────────── */}
      <section className="lp-featured">
        <div className="lp-featured__head">
          <div>
            <div className="lp-eyebrow">Disponibles ahora</div>
            <h2 className="lp-featured__title">Terrenos destacados</h2>
          </div>
          <Link to={catalogTo} className="lp-seeall">
            Ver todos <ArrowRight size={16} />
          </Link>
        </div>
        <div className="lp-grid3">
          {featured.map((card) => (
            <LandCard key={card.id} card={card} />
          ))}
        </div>
      </section>

      {/* ── Cómo funciona ───────────────────────────────────────────── */}
      <section className="lp-how" id="como-funciona">
        <h2 className="lp-how__title">Cómo funciona</h2>
        <div className="lp-how__grid">
          {STEPS.map((step) => (
            <div key={step.num}>
              <div className="lp-step__num">{step.num}</div>
              <div className="lp-step__rule" />
              <h3 className="lp-step__title">{step.title}</h3>
              <p className="lp-step__desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA / testimonio ────────────────────────────────────────── */}
      <section className="lp-cta">
        <div>
          <Quote size={38} className="lp-cta__quote-icon" />
          <p className="lp-cta__quote">
            Encontré 8 hectáreas con agua a 20 minutos de mi casa. Hablé directo con el dueño y en una
            semana ya tenía el ganado ahí.
          </p>
          <div className="lp-cta__author">
            <span className="lp-cta__avatar">
              <Sprout size={22} strokeWidth={1.8} />
            </span>
            <div>
              <div className="lp-cta__author-name">Ricardo Him</div>
              <div className="lp-cta__author-role">Ganadero · Herrera</div>
            </div>
          </div>
        </div>
        <div className="lp-cta__aside">
          <h3 className="lp-cta__aside-title">¿Listo para empezar?</h3>
          <p className="lp-cta__aside-text">Crea tu cuenta gratis y publica o encuentra tierra hoy.</p>
          <Link to={isSignedIn ? catalogTo : "/register"} className="lp-btn lp-btn--clay">
            {isSignedIn ? "Explorar catálogo" : "Crear cuenta gratis"} <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="lp-foot">
        <div className="lp-foot__brand">
          <span className="lp-brand__mark">
            <Sprout size={24} strokeWidth={1.8} />
          </span>
          <span className="lp-foot__brand-name">TerraShare</span>
        </div>
        <div className="lp-foot__links">
          <Link to={catalogTo}>Catálogo</Link>
        </div>
        <div className="lp-foot__copy">© {new Date().getFullYear()} TerraShare · Hecho en Panamá</div>
      </footer>
    </div>
  );
}
