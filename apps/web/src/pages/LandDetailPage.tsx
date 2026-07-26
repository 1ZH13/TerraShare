import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useClerk, useUser } from "@clerk/clerk-react";
import type { LandDto, PublicOwnerProfileDto } from "@terrashare/shared";
import {
  Heart,
  Share2,
  MapPin,
  Ruler,
  Sprout,
  Route,
  Droplets,
  Calendar,
  MessageCircle,
  ArrowRight,
  ImageIcon,
  ShieldCheck,
  BadgeCheck,
  User,
  Flag,
  Star,
  CalendarClock,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { createChat, getLandById, createReport, getOwnerPublicProfile, photoSrc, getRatingByUser, createVisit } from "../services/api";
import BackLink from "../components/BackLink";
import VisitModal from "../components/VisitModal";
import type { ReportReason } from "../services/api";
import { useFavorites } from "../hooks/useFavorites";
import { monthlyPrice } from "../lib/land-price";
import "./detail.css";

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "fraude", label: "Fraude o estafa" },
  { value: "informacion_falsa", label: "Información falsa" },
  { value: "contenido_inapropiado", label: "Contenido inapropiado" },
  { value: "spam", label: "Spam" },
  { value: "otro", label: "Otro" },
];

type Operation = "alquiler" | "venta" | "ambas";

// Los campos operation/salePrice/water/access/features ya viven en LandDto (#138).
type DetailLand = LandDto;

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

/** "julio de 2026" a partir de una fecha ISO; cadena vacía si es inválida (#150). */
function formatMemberSince(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-PA", { month: "long", year: "numeric" });
}

function formatAvailable(iso?: string): string {
  if (!iso) return "Ahora";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Ahora";
  return d.toLocaleDateString("es-PA", { month: "short", year: "numeric" });
}

// El backend ya aporta `operation` (#138); alquiler por defecto si viniera vacío.
function getOperation(land: DetailLand): Operation {
  return land.operation ?? "alquiler";
}

function BrandMark() {
  return (
    <span className="det-nav__brand">
      <span className="det-nav__brand-mark">
        <Sprout size={24} strokeWidth={1.8} />
      </span>
      <span className="det-nav__brand-name">TerraShare</span>
    </span>
  );
}

export default function LandDetailPage() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { openSignIn } = useClerk();
  const { isSignedIn, user } = useUser();

  const [land, setLand] = useState<DetailLand | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [owner, setOwner] = useState<PublicOwnerProfileDto | null>(null);
  const [ownerRating, setOwnerRating] = useState<{ averageRating: number; totalReviews: number } | null>(null);
  // Agendar visita (HU-100 / #326).
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitFeedback, setVisitFeedback] = useState("");

  // Favoritos (#147): solo consultamos el backend si hay sesión.
  const { isFavorite, toggle: toggleFavorite } = useFavorites({ enabled: Boolean(isSignedIn) });

  const handleToggleFavorite = () => {
    if (!isSignedIn) {
      openSignIn({ redirectUrl: `/lands/${id}` });
      return;
    }
    toggleFavorite(id!).catch((err) => console.error("No se pudo actualizar el guardado:", err));
  };

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("fraude");
  const [reportDesc, setReportDesc] = useState("");
  const [reportState, setReportState] = useState<"idle" | "sending" | "done" | "error">("idle");
  // Índice de la foto abierta en el visor a pantalla completa; null = cerrado (#447).
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    // Al cambiar de terreno se cierra el visor por si quedó abierto en una foto
    // del terreno anterior.
    setLightboxIndex(null);
    getLandById(id!)
      .then((data) => {
        if (!active) return;
        setLand(data);
        setStatus(data ? "ready" : "error");
        // Perfil público del propietario (#150) para la tarjeta de confianza.
        if (data?.ownerId) {
          getOwnerPublicProfile(data.ownerId)
            .then((profile) => active && setOwner(profile))
            .catch(() => active && setOwner(null));
          getRatingByUser(data.ownerId)
            .then((rating) => active && setOwnerRating(rating))
            .catch(() => {});
        }
      })
      .catch((err) => {
        console.error("Error cargando terreno:", err);
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [id]);

  // Visor a pantalla completa (#447): Escape cierra, flechas navegan. Solo activo
  // mientras está abierto, para no atrapar el teclado del resto de la página.
  useEffect(() => {
    if (lightboxIndex === null) return;
    const total = land?.photos?.length ?? 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      else if (e.key === "ArrowLeft" && total > 0)
        setLightboxIndex((i) => (i === null ? i : (i - 1 + total) % total));
      else if (e.key === "ArrowRight" && total > 0)
        setLightboxIndex((i) => (i === null ? i : (i + 1) % total));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, land]);

  // Ocultar los botones no impide la llamada, así que los manejadores también
  // se plantan. El backend es quien manda —ya rechaza ambas cosas—, pero así
  // nadie acaba en una pantalla de reserva o de chats que no lleva a nada (#393).
  const ownsThisLand = (userId: string | undefined) =>
    Boolean(land && userId && land.ownerId === userId);

  // `modo` decide si la reserva es un alquiler o una oferta de compra. En un
  // terreno «ambas» cada botón fija el suyo, para que el detalle ofrezca las dos
  // cosas y ReservePage no tenga que adivinar (#428).
  const goReserve = (modo: "alquiler" | "venta") => {
    if (!isSignedIn) {
      openSignIn({ redirectUrl: `/reserve/${id}` });
      return;
    }
    if (ownsThisLand(user?.id)) return;
    navigate({ to: "/reserve/$landId", params: { landId: id! }, search: { modo } });
  };

  const handleContact = async () => {
    if (!isSignedIn || !user) {
      openSignIn({ redirectUrl: `/lands/${id}` });
      return;
    }
    if (ownsThisLand(user.id)) return;
    try {
      await createChat({ landId: id, participants: [{ userId: user.id, role: "tenant" }] });
    } catch (err) {
      console.error("No se pudo iniciar el chat:", err);
    }
    navigate({ to: "/dashboard/chats" });
  };

  const openReport = () => {
    if (!isSignedIn) {
      openSignIn({ redirectUrl: `/lands/${id}` });
      return;
    }
    setReportState("idle");
    setReportOpen(true);
  };

  const submitReport = async () => {
    if (!id) return;
    setReportState("sending");
    try {
      await createReport({
        targetType: "land",
        targetId: id,
        reason: reportReason,
        description: reportDesc.trim() || undefined,
      });
      setReportState("done");
      setReportDesc("");
    } catch (err) {
      console.error("No se pudo enviar el reporte:", err);
      setReportState("error");
    }
  };

  if (status === "loading") {
    return (
      <div className="det">
        <nav className="det-nav">
          <BackLink fallbackTo="/catalog" />
          <BrandMark />
          <span />
        </nav>
        <div className="det-state">Cargando terreno…</div>
      </div>
    );
  }

  if (status === "error" || !land) {
    return (
      <div className="det">
        <nav className="det-nav">
          <BackLink fallbackTo="/catalog" />
          <BrandMark />
          <span />
        </nav>
        <div className="det-state">
          <h1>Terreno no encontrado</h1>
          <p>El terreno que buscas no existe o no está disponible.</p>
          <Link to="/catalog" className="det-btn det-btn--primary" style={{ marginTop: "1.5rem", display: "inline-flex", width: "auto", padding: "13px 22px" }}>
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  const operation = getOperation(land);
  const isSale = operation === "venta" || operation === "ambas";
  // Un terreno «ambas» ofrece las dos operaciones; antes isSale (true para ambas)
  // hacía que solo se mostrara «Hacer oferta» y nunca el alquiler (#428).
  const offersRent = operation === "alquiler" || operation === "ambas";
  const offersSale = operation === "venta" || operation === "ambas";
  const monthly = monthlyPrice(land);
  // Todas las fotos del terreno; el mosaico muestra hasta 5 y el visor el resto (#447).
  const photos = land.photos ?? [];
  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const stepLightbox = (delta: number) =>
    setLightboxIndex((i) => (i === null ? i : (i + delta + photos.length) % photos.length));
  /** La publicación es mía: no tiene sentido alquilármela ni escribirme (#393). */
  const isOwner = Boolean(isSignedIn && user?.id === land.ownerId);
  const loc = land.location;

  // Especificaciones a partir de datos reales (agua/acceso/suelo llegan con #138).
  const specs = [
    { icon: Ruler, label: "Área", value: `${land.area} ha` },
    { icon: Sprout, label: "Uso", value: formatUse(land.allowedUses?.[0]) },
    { icon: MapPin, label: "Provincia", value: loc?.province ?? "—" },
    loc?.district ? { icon: Route, label: "Distrito", value: loc.district } : null,
    loc?.corregimiento ? { icon: MapPin, label: "Corregimiento", value: loc.corregimiento } : null,
    { icon: Calendar, label: "Disponible", value: formatAvailable(land.availability?.availableFrom) },
  ].filter((s): s is { icon: typeof Ruler; label: string; value: string } => s !== null);

  // Usos adicionales (el principal se queda en su tarjeta) y agua/acceso salen
  // como chips compactos debajo de las specs (#443): antes los usos extra no se
  // mostraban en ninguna parte y agua/acceso ocupaban una tarjeta entera.
  const extraUses = (land.allowedUses ?? []).slice(1);

  const locationText = [loc?.province, loc?.district, loc?.corregimiento ?? loc?.addressLine]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="det">
      {/* nav propio del detalle */}
      <nav className="det-nav">
        <BackLink fallbackTo="/catalog" />
        <BrandMark />
        <div className="det-nav__actions">
          <button
            type="button"
            className={`det-nav__action${isFavorite(id!) ? " is-active" : ""}`}
            title={isFavorite(id!) ? "Quitar de guardados" : "Guardar"}
            aria-pressed={isFavorite(id!)}
            onClick={handleToggleFavorite}
          >
            <Heart size={18} fill={isFavorite(id!) ? "currentColor" : "none"} />{" "}
            {isFavorite(id!) ? "Guardado" : "Guardar"}
          </button>
          <button
            type="button"
            className="det-nav__action"
            title="Compartir"
            onClick={() => {
              if (navigator.share) navigator.share({ title: land.title, url: window.location.href });
            }}
          >
            <Share2 size={17} />
          </button>
          {/* Agendar visita (HU-100): solo tiene sentido si no soy el dueño. */}
          {isSignedIn && user?.id !== land.ownerId && (
            <button
              type="button"
              className="det-nav__action"
              title="Agendar visita"
              aria-label="Agendar visita"
              onClick={() => { setVisitFeedback(""); setVisitOpen(true); }}
            >
              <CalendarClock size={17} /> Visitar
            </button>
          )}
          {/* Reportarse a uno mismo solo genera ruido para moderación (#393). */}
          {user?.id !== land.ownerId && (
            <button
              type="button"
              className="det-nav__action"
              title="Reportar terreno"
              aria-label="Reportar terreno"
              onClick={openReport}
            >
              <Flag size={17} /> Reportar
            </button>
          )}
        </div>
      </nav>

      {visitFeedback && (
        <p className="det-visit-feedback" role="status" style={{ padding: "0 1rem" }}>
          {visitFeedback}
        </p>
      )}

      {visitOpen && (
        <VisitModal
          landTitle={land.title}
          onClose={() => setVisitOpen(false)}
          onSubmit={async (proposedDate, proposedTime, message) => {
            await createVisit(land.id, { proposedDate, proposedTime, message: message || undefined });
            setVisitFeedback("Solicitud de visita enviada. Puedes seguirla en «Mis Visitas».");
          }}
        />
      )}

      {reportOpen && (
        <div className="det-report" role="dialog" aria-modal="true" aria-label="Reportar terreno">
          <div className="det-report__box">
            {reportState === "done" ? (
              <>
                <h2 className="det-report__title">Reporte enviado</h2>
                <p className="det-report__lead">
                  Gracias. Nuestro equipo de moderación revisará este terreno.
                </p>
                <div className="det-report__actions">
                  <button type="button" className="det-btn det-btn--primary" onClick={() => setReportOpen(false)}>
                    Cerrar
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="det-report__title">Reportar «{land.title}»</h2>
                <p className="det-report__lead">Cuéntanos qué problema tiene esta publicación.</p>

                <label className="det-report__label" htmlFor="report-reason">Motivo</label>
                <select
                  id="report-reason"
                  className="det-report__select"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as ReportReason)}
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>

                <label className="det-report__label" htmlFor="report-desc">Descripción (opcional)</label>
                <textarea
                  id="report-desc"
                  className="det-report__textarea"
                  rows={3}
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="Agrega detalles que ayuden a la revisión…"
                />

                {reportState === "error" && (
                  <p className="det-report__error">No se pudo enviar el reporte. Inténtalo de nuevo.</p>
                )}

                <div className="det-report__actions">
                  <button
                    type="button"
                    className="det-btn det-btn--ghost"
                    onClick={() => setReportOpen(false)}
                    disabled={reportState === "sending"}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="det-btn det-btn--primary"
                    onClick={submitReport}
                    disabled={reportState === "sending"}
                  >
                    {reportState === "sending" ? "Enviando…" : "Enviar reporte"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <main id="contenido" className="det-wrap">
        {/* galería (#447): mosaico (1 grande + hasta 4) y visor con TODAS las fotos */}
        {photos.length > 0 ? (
          <div className={`det-mosaic ${photos.length === 1 ? "det-mosaic--single" : ""}`}>
            <button
              type="button"
              className="det-mosaic__main det-photo--img"
              onClick={() => openLightbox(0)}
              aria-label={`Ver foto 1 de ${photos.length} a pantalla completa`}
            >
              <img src={photoSrc(photos[0])} alt={`${land.title} — foto 1`} />
            </button>
            {photos.length > 1 && (
              <div
                className="det-mosaic__grid"
                style={{ gridTemplateColumns: photos.length >= 4 ? "1fr 1fr" : "1fr" }}
              >
                {photos.slice(1, 5).map((photo, i) => {
                  const idx = i + 1;
                  const showMore = idx === 4 && photos.length > 5;
                  return (
                    <button
                      type="button"
                      key={photo}
                      className="det-mosaic__cell det-photo--img"
                      onClick={() => openLightbox(idx)}
                      aria-label={`Ver foto ${idx + 1} de ${photos.length} a pantalla completa`}
                    >
                      <img src={photoSrc(photo)} alt={`${land.title} — foto ${idx + 1}`} />
                      {showMore && <span className="det-mosaic__more">+{photos.length - 5}</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <button type="button" className="det-mosaic__all" onClick={() => openLightbox(0)}>
              <ImageIcon size={15} /> Ver todas las fotos
            </button>
          </div>
        ) : (
          <div className="det-gallery" aria-hidden="true">
            <div className="det-photo det-photo--main">
              <ImageIcon size={40} strokeWidth={1.4} />
              <span>Foto principal — vista del terreno</span>
            </div>
            <div className="det-photo">
              <ImageIcon size={24} strokeWidth={1.4} />
            </div>
            <div className="det-photo det-gallery__hide-sm">
              <ImageIcon size={24} strokeWidth={1.4} />
            </div>
          </div>
        )}

        {/* visor a pantalla completa (#447) */}
        {lightboxIndex !== null && photos[lightboxIndex] && (
          <div
            className="det-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Fotos del terreno"
            onClick={closeLightbox}
          >
            <button type="button" className="det-lightbox__close" onClick={closeLightbox} aria-label="Cerrar">
              <X size={22} />
            </button>
            {photos.length > 1 && (
              <button
                type="button"
                className="det-lightbox__nav det-lightbox__nav--prev"
                onClick={(e) => { e.stopPropagation(); stepLightbox(-1); }}
                aria-label="Foto anterior"
              >
                <ChevronLeft size={26} />
              </button>
            )}
            <img
              className="det-lightbox__img"
              src={photoSrc(photos[lightboxIndex])}
              alt={`${land.title} — foto ${lightboxIndex + 1} de ${photos.length}`}
              onClick={(e) => e.stopPropagation()}
            />
            {photos.length > 1 && (
              <button
                type="button"
                className="det-lightbox__nav det-lightbox__nav--next"
                onClick={(e) => { e.stopPropagation(); stepLightbox(1); }}
                aria-label="Foto siguiente"
              >
                <ChevronRight size={26} />
              </button>
            )}
            <span className="det-lightbox__counter">
              {lightboxIndex + 1} / {photos.length}
            </span>
          </div>
        )}

        <div className="det-body">
          {/* columna izquierda */}
          <div>
            <div className="det-badges">
              <span className={`det-badge ${isSale ? "det-badge--sale" : ""}`}>
                {isSale ? "En venta" : formatUse(land.allowedUses?.[0])}
              </span>
              {land.verified && (
                <span className="det-badge det-badge--verified">
                  <BadgeCheck size={13} /> Verificado
                </span>
              )}
            </div>
            <h1 className="det-title">{land.title}</h1>
            <p className="det-loc">
              <MapPin size={17} /> {locationText} · {land.area} hectáreas
            </p>

            <div className="det-specs">
              {specs.map((spec) => {
                const Icon = spec.icon;
                return (
                  <div key={spec.label} className="det-spec">
                    <span className="det-spec__icon">
                      <Icon size={20} />
                    </span>
                    <div className="det-spec__label">{spec.label}</div>
                    <div className="det-spec__value">{spec.value}</div>
                  </div>
                );
              })}
            </div>

            {/* Chips: usos adicionales + agua/acceso (#443). El uso principal se
                mantiene arriba en su tarjeta de spec. */}
            {(extraUses.length > 0 || land.water || land.access) && (
              <div className="det-chips">
                {extraUses.map((use) => (
                  <span key={`use-${use}`} className="det-chip det-chip--use">
                    <Sprout size={13} /> {formatUse(use)}
                  </span>
                ))}
                {land.water && (
                  <span className="det-chip">
                    <Droplets size={13} /> {land.water}
                  </span>
                )}
                {land.access && (
                  <span className="det-chip">
                    <Route size={13} /> {land.access}
                  </span>
                )}
              </div>
            )}

            <h2 className="det-section-title">Sobre el terreno</h2>
            <p className="det-desc">
              {land.description ?? "El propietario aún no agregó una descripción para este terreno."}
            </p>

            {land.features && land.features.length > 0 && (
              <div className="det-tags">
                {land.features.map((f) => (
                  <span key={f} className="det-tag">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* tarjeta de acción sticky */}
          <aside className="det-aside">
            <div className="det-card">
              <div className="det-price__label">
                {operation === "ambas"
                  ? "Alquiler o venta"
                  : isSale
                    ? "Precio de venta"
                    : "Precio de alquiler"}
              </div>
              <div className="det-price">
                {operation === "ambas" ? (
                  <>
                    {monthly !== null ? (
                      <>
                        ${monthly.toLocaleString("es-PA")}
                        <span>/mes</span>
                      </>
                    ) : (
                      "A consultar"
                    )}
                    {typeof land.salePrice === "number" && (
                      <div className="det-price__alt">
                        o ${land.salePrice.toLocaleString("es-PA")} en venta
                      </div>
                    )}
                  </>
                ) : isSale ? (
                  typeof land.salePrice === "number" ? (
                    `$${land.salePrice.toLocaleString("es-PA")}`
                  ) : (
                    "A consultar"
                  )
                ) : monthly !== null ? (
                  <>
                    ${monthly.toLocaleString("es-PA")}
                    <span>/mes</span>
                  </>
                ) : (
                  "A consultar"
                )}
              </div>

              {isOwner ? (
                // El dueño veía —y podía pulsar— «Solicitar alquiler» y
                // «Preguntar al dueño» en su propia ficha, lo segundo abriendo
                // un chat consigo mismo (#393). Se le ofrece lo que sí le sirve.
                <>
                  <p className="det-own-note">Esta publicación es tuya.</p>
                  <Link to="/dashboard/lands" className="det-btn det-btn--primary">
                    Gestionar mis terrenos <ArrowRight size={18} />
                  </Link>
                </>
              ) : (
                <>
                  {offersRent && (
                    <button
                      type="button"
                      className="det-btn det-btn--primary"
                      onClick={() => goReserve("alquiler")}
                    >
                      Solicitar alquiler <ArrowRight size={18} />
                    </button>
                  )}
                  {offersSale && (
                    <button
                      type="button"
                      className={`det-btn ${offersRent ? "det-btn--ghost" : "det-btn--primary"}`}
                      onClick={() => goReserve("venta")}
                    >
                      Solicitar compra <ArrowRight size={18} />
                    </button>
                  )}
                  <button type="button" className="det-btn det-btn--ghost" onClick={handleContact}>
                    <MessageCircle size={17} /> Preguntar al dueño
                  </button>
                </>
              )}

              <div className="det-divider" />

              <div className="det-owner">
                <span className="det-owner__avatar" aria-hidden="true">
                  <User size={20} />
                </span>
                <div>
                  <div className="det-owner__name">
                    {owner?.displayName ?? "Propietario"}
                    {owner?.verified && (
                      <BadgeCheck size={15} className="det-owner__check" aria-label="Verificado" />
                    )}
                  </div>
                  {ownerRating && ownerRating.totalReviews > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", margin: "0.15rem 0" }}>
                      <Star size={13} fill="#facc15" color="#facc15" />
                      <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{ownerRating.averageRating}</span>
                      <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>({ownerRating.totalReviews})</span>
                    </div>
                  )}
                  <div className="det-owner__role">
                    {owner
                      ? [
                          owner.memberSince ? `Miembro desde ${formatMemberSince(owner.memberSince)}` : null,
                          owner.activeLandsCount > 0
                            ? `${owner.activeLandsCount} ${owner.activeLandsCount === 1 ? "terreno" : "terrenos"}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Publica en TerraShare"
                      : "Publica en TerraShare"}
                  </div>
                </div>
              </div>

              {owner?.verified ? (
                <div className="det-note det-note--verified">
                  <ShieldCheck size={15} /> Identidad del propietario verificada por TerraShare
                </div>
              ) : (
                <div className="det-note">
                  <ShieldCheck size={15} /> Coordina y acuerda de forma segura dentro de TerraShare
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
