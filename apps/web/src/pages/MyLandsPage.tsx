import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useUser } from "@clerk/clerk-react";
import type { LandDto } from "@terrashare/shared";
import { Plus, Eye, Inbox, MapPin, Map, Upload } from "lucide-react";
import { getMyLands, photoSrc, setLandStatus } from "../services/api";
import EmptyState from "../components/EmptyState";
import "./mylands.css";

type LoadState = "loading" | "ready" | "error";

const USE_LABELS: Record<string, string> = {
  agricultura: "Agricultura",
  ganaderia: "Ganadería",
  forestal: "Forestal",
  acuicultura: "Acuicultura",
  mixto: "Mixto",
  otro: "Otro",
};

function useLabel(use?: string): string {
  if (!use) return "Terreno";
  return USE_LABELS[use] ?? use;
}

/**
 * Precio a mostrar según la operación del terreno.
 *
 * Un terreno de solo venta no tiene renta mensual, así que la tarjeta anunciaba
 * «$0/mes» en vez del precio de venta (#363).
 */
function priceLabel(land: LandDto): string {
  const monthly = land.priceRule?.pricePerMonth;
  const sale = land.salePrice;

  if (land.operation === "venta") {
    return sale ? `$${sale.toLocaleString("es-PA")} en venta` : "Precio a convenir";
  }
  const rent = monthly ? `$${monthly.toLocaleString("es-PA")}/mes` : "Precio a convenir";
  if (land.operation === "ambas" && sale) {
    return `${rent} · $${sale.toLocaleString("es-PA")} en venta`;
  }
  return rent;
}

export default function MyLandsPage() {
  const { user } = useUser();
  const [lands, setLands] = useState<LandDto[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");
  // Terreno cuya publicación está en curso, para no repetir la llamada.
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publishError, setPublishError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    getMyLands()
      .then((data) => {
        if (!active) return;
        setLands(data || []);
        setStatus("ready");
      })
      .catch((err) => {
        console.error("Error fetching my lands:", err);
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [user]);

  /**
   * Publica un borrador (#387).
   *
   * Los terrenos creados antes del arreglo del asistente se quedaron en `draft`
   * y son invisibles en el catálogo, sin ninguna forma de rescatarlos desde la
   * web. Este botón es esa salida.
   */
  const publishDraft = async (landId: string) => {
    setPublishing(landId);
    setPublishError("");
    try {
      const updated = await setLandStatus(landId, "active");
      setLands((prev) => prev.map((l) => (l.id === landId ? { ...l, status: updated.status } : l)));
    } catch (err) {
      setPublishError(
        err instanceof Error ? err.message : "No se pudo publicar el terreno. Inténtalo de nuevo.",
      );
    } finally {
      setPublishing(null);
    }
  };

  return (
    <div className="ml">
      <div className="ml-head">
        <div>
          <h1 className="ml-title">Mis terrenos</h1>
          <p className="ml-sub">Gestiona tus publicaciones y su estado.</p>
        </div>
        {/* TODO(#134): el wizard de publicación aún no está rediseñado. */}
        <Link to="/dashboard/lands/new" className="ml-btn">
          <Plus size={17} /> Publicar terreno
        </Link>
      </div>

      {publishError && (
        <p className="ml-publisherror" role="alert">
          {publishError}
        </p>
      )}

      {status === "loading" ? (
        <div className="ml-grid">
          <div className="ml-skeleton" />
          <div className="ml-skeleton" />
          <div className="ml-skeleton" />
        </div>
      ) : status === "error" ? (
        <div className="ml-empty ml-empty--error">
          No pudimos cargar tus terrenos ahora mismo. (Pendiente de backend, #136.)
        </div>
      ) : lands.length === 0 ? (
        <EmptyState
          icon={Map}
          title="Publica tu primer terreno"
          description="Sube fotos, ubicación y precio. Se publica de inmediato."
          action={{ label: "Publicar terreno", to: "/dashboard/lands/new" }}
        />
      ) : (
        <div className="ml-grid">
          {lands.map((land) => {
            const active = land.status === "active";
            const badgeCls = active
              ? ""
              : land.status === "draft"
                ? "ml-card__badge--draft"
                : "ml-card__badge--paused";
            const badgeLabel = active ? "Publicada" : land.status === "draft" ? "Borrador" : "Pausada";
            return (
              <Link key={land.id} to="/lands/$id" params={{ id: land.id }} className="ml-card">
                <div className="ml-card__media">
                  {land.photos?.[0] ? (
                    <img className="ml-card__img" src={photoSrc(land.photos[0])} alt="" />
                  ) : (
                    <div className="ml-card__photo" aria-hidden="true">
                      <MapPin size={26} strokeWidth={1.4} />
                    </div>
                  )}
                  <span className={`ml-card__badge ${badgeCls}`}>{badgeLabel}</span>
                </div>
                <div className="ml-card__body">
                  <div className="ml-card__title">{land.title}</div>
                  <div className="ml-card__meta">
                    {useLabel(land.allowedUses?.[0])} · {priceLabel(land)}
                  </div>
                  {/* TODO(#136): sin métricas de vistas/solicitudes por terreno todavía. */}
                  <div className="ml-card__stats">
                    <span className="ml-card__stat">
                      <Eye size={15} /> —
                    </span>
                    <span className="ml-card__stat">
                      <Inbox size={15} /> —
                    </span>
                  </div>
                  {/* Rescate de borradores (#387): invisibles en el catálogo y,
                      hasta ahora, sin ninguna forma de publicarlos. El botón
                      vive dentro de la tarjeta-enlace, así que corta la
                      navegación para no acabar en la ficha del terreno. */}
                  {land.status === "draft" && (
                    <button
                      type="button"
                      className="ml-card__publish"
                      disabled={publishing === land.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        publishDraft(land.id);
                      }}
                    >
                      <Upload size={15} />
                      {publishing === land.id ? "Publicando…" : "Publicar"}
                    </button>
                  )}
                </div>
              </Link>
            );
          })}
          <Link to="/dashboard/lands/new" className="ml-add">
            <Plus size={26} />
            <span>Publicar otro terreno</span>
          </Link>
        </div>
      )}
    </div>
  );
}
