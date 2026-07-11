import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useClerk, useUser } from "@clerk/clerk-react";
import type { LandDto, PublicOwnerProfileDto } from "@terrashare/shared";
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Ruler,
  Sprout,
  Route,
  Calendar,
  MessageCircle,
  ArrowRight,
  ImageIcon,
  ShieldCheck,
  BadgeCheck,
  User,
  Flag,
} from "lucide-react";
import { createChat, getLandById, createReport, getOwnerPublicProfile } from "../services/api";
import type { ReportReason } from "../services/api";
import { useFavorites } from "../hooks/useFavorites";
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

  useEffect(() => {
    let active = true;
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

  const handleRent = () => {
    if (!isSignedIn) {
      openSignIn({ redirectUrl: `/reserve/${id}` });
      return;
    }
    navigate({ to: "/reserve/$landId", params: { landId: id! } });
  };

  const handleContact = async () => {
    if (!isSignedIn || !user) {
      openSignIn({ redirectUrl: `/lands/${id}` });
      return;
    }
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
          <Link to="/catalog" className="det-nav__back">
            <ArrowLeft size={17} /> Catálogo
          </Link>
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
          <Link to="/catalog" className="det-nav__back">
            <ArrowLeft size={17} /> Catálogo
          </Link>
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
  const monthly = land.priceRule?.pricePerMonth;
  const loc = land.location;

  // Especificaciones a partir de datos reales (agua/acceso/suelo llegan con #138).
  const specs = [
    { icon: Ruler, label: "Área", value: `${land.area} ha` },
    { icon: Sprout, label: "Uso", value: formatUse(land.allowedUses?.[0]) },
    { icon: MapPin, label: "Provincia", value: loc?.province ?? "—" },
    loc?.district ? { icon: Route, label: "Distrito", value: loc.district } : null,
    loc?.corregimiento ? { icon: MapPin, label: "Corregimiento", value: loc.corregimiento } : null,
    { icon: Calendar, label: "Disponible", value: formatAvailable(land.availability?.availableFrom) },
    land.water ? { icon: MapPin, label: "Agua", value: land.water } : null,
    land.access ? { icon: Route, label: "Acceso", value: land.access } : null,
  ].filter((s): s is { icon: typeof Ruler; label: string; value: string } => s !== null);

  const locationText = [loc?.province, loc?.district, loc?.corregimiento ?? loc?.addressLine]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="det">
      {/* nav propio del detalle */}
      <nav className="det-nav">
        <Link to="/catalog" className="det-nav__back">
          <ArrowLeft size={17} /> Catálogo
        </Link>
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
          <button
            type="button"
            className="det-nav__action"
            title="Reportar terreno"
            aria-label="Reportar terreno"
            onClick={openReport}
          >
            <Flag size={17} /> Reportar
          </button>
        </div>
      </nav>

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

      <div className="det-wrap">
        {/* galería */}
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
              <div className="det-price__label">{isSale ? "Precio de venta" : "Precio de alquiler"}</div>
              <div className="det-price">
                {isSale ? (
                  typeof land.salePrice === "number" ? (
                    `$${land.salePrice.toLocaleString("es-PA")}`
                  ) : (
                    "A consultar"
                  )
                ) : typeof monthly === "number" ? (
                  <>
                    ${monthly.toLocaleString("es-PA")}
                    <span>/mes</span>
                  </>
                ) : (
                  "A consultar"
                )}
              </div>

              <button type="button" className="det-btn det-btn--primary" onClick={handleRent}>
                {isSale ? "Hacer oferta" : "Solicitar alquiler"} <ArrowRight size={18} />
              </button>
              <button type="button" className="det-btn det-btn--ghost" onClick={handleContact}>
                <MessageCircle size={17} /> Preguntar al dueño
              </button>

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
      </div>
    </div>
  );
}
