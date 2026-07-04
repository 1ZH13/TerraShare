import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import type { LandDto } from "@terrashare/shared";
import { Badge, Button, Card } from "../components/ui";
import { createChat, getLandById } from "../services/api";
import PanamaMap from "../components/PanamaMap";
import "./detail.css";

type Operation = "alquiler" | "venta" | "ambas";

// Campos que llegarán con #138 (agua/acceso/características/título) y #140
// (operación y precio de venta). Aún no existen en LandDto; se leen de forma
// opcional para dejar lista la variante de venta.
type DetailLand = LandDto & {
  operation?: Operation;
  salePrice?: number;
  water?: string;
  access?: string;
  titleStatus?: string;
  features?: string[];
};

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

function formatMonth(iso?: string): string {
  if (!iso) return "Ahora";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Ahora";
  return `Desde ${d.toLocaleDateString("es-PA", { month: "short", year: "numeric" })}`;
}

// TODO(#140): sin campo de operación en el backend, el detalle es de alquiler
// por defecto. La rama de venta queda lista para cuando #140 lo aporte.
function getOperation(land: DetailLand): Operation {
  return land.operation ?? "alquiler";
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function PhotoIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5L9 20" />
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l6-6 12 12-6 6z" />
      <path d="M7 9l1.5 1.5M10 6l1.5 1.5M13 9l1.5 1.5M9 13l1.5 1.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function DropletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.7 6.3 8.4a8 8 0 1 0 11.4 0Z" />
    </svg>
  );
}

function RoadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 22 8 2M20 22 16 2M12 6v3M12 13v3M12 20v1" />
    </svg>
  );
}

function CertificateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="9" r="6" />
      <path d="m9 14-1 8 4-2 4 2-1-8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function LandDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openSignIn } = useClerk();
  const { isSignedIn, user } = useUser();

  const [land, setLand] = useState<DetailLand | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    getLandById(id!)
      .then((data) => {
        if (!active) return;
        setLand(data);
        setStatus(data ? "ready" : "error");
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
    navigate(`/reserve/${id}`, { state: { land } });
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
    navigate("/dashboard/chats");
  };

  if (status === "loading") {
    return (
      <div className="det">
        <p className="det-state">Cargando terreno…</p>
      </div>
    );
  }

  if (status === "error" || !land) {
    return (
      <div className="det">
        <div className="det-state">
          <h1 className="ts-title">Terreno no encontrado</h1>
          <p>El terreno que buscas no existe o no está disponible.</p>
          <Link to="/catalog" className="ds-btn ds-btn--primary" style={{ marginTop: "1rem" }}>
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  const operation = getOperation(land);
  const isSale = operation === "venta" || operation === "ambas";
  const monthly = land.priceRule?.pricePerMonth;
  const locationParts = [land.location?.province, land.location?.district, land.location?.corregimiento ?? land.location?.addressLine].filter(Boolean);

  return (
    <div className="det">
      <Link to="/catalog" className="det-back">
        ← Volver al catálogo
      </Link>

      <div className="det-gallery" aria-hidden="true">
        <div className="det-gallery__main">
          <PhotoIcon size={44} />
        </div>
        <div className="det-gallery__side">
          <div className="det-gallery__tile">
            <PhotoIcon size={24} />
          </div>
          <div className="det-gallery__tile">
            <PhotoIcon size={24} />
          </div>
        </div>
      </div>

      <div className="det-body">
        <div>
          <div className="det-badges">
            <Badge tone="green">{formatUse(land.allowedUses?.[0])}</Badge>
            <Badge tone={isSale ? "clay" : "beige"}>{isSale ? "En venta" : "Alquiler"}</Badge>
          </div>
          <h1 className="ts-title det-title">{land.title}</h1>
          <p className="det-loc">
            <PinIcon />
            {locationParts.join(" · ")}
          </p>

          <div className="det-specs">
            <div className="det-spec">
              <RulerIcon />
              <div className="det-spec__label">Área</div>
              <div className="det-spec__value">{land.area} hectáreas</div>
            </div>
            <div className="det-spec">
              <CalendarIcon />
              <div className="det-spec__label">Disponible</div>
              <div className="det-spec__value">{formatMonth(land.availability?.availableFrom)}</div>
            </div>
            {/* Agua/Acceso/Título llegan con #138; se muestran solo si existen. */}
            {land.water ? (
              <div className="det-spec">
                <DropletIcon />
                <div className="det-spec__label">Agua</div>
                <div className="det-spec__value">{land.water}</div>
              </div>
            ) : null}
            {land.access ? (
              <div className="det-spec">
                <RoadIcon />
                <div className="det-spec__label">Acceso</div>
                <div className="det-spec__value">{land.access}</div>
              </div>
            ) : null}
            {isSale && land.titleStatus ? (
              <div className="det-spec">
                <CertificateIcon />
                <div className="det-spec__label">Título</div>
                <div className="det-spec__value">{land.titleStatus}</div>
              </div>
            ) : null}
          </div>

          {land.description ? (
            <>
              <h2 className="det-section-title">Descripción</h2>
              <p className="det-desc">{land.description}</p>
            </>
          ) : null}

          {land.features && land.features.length > 0 ? (
            <>
              <h2 className="det-section-title">Características</h2>
              <div className="det-features">
                {land.features.map((f) => (
                  <span key={f} className="det-feature">
                    <CheckIcon />
                    {f}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <aside className="det-aside">
          <Card>
            {isSale ? (
              <>
                <div className="det-price__label">Precio de venta</div>
                <div className="det-price">
                  {typeof land.salePrice === "number" ? `$${land.salePrice.toLocaleString("es-PA")}` : "A consultar"}
                </div>
              </>
            ) : (
              <div className="det-price">
                {typeof monthly === "number" ? (
                  <>
                    ${monthly.toLocaleString("es-PA")}
                    <span> /mes</span>
                  </>
                ) : (
                  "A consultar"
                )}
              </div>
            )}

            <div className="det-actions">
              {isSale ? (
                // TODO(#140): flujo de oferta de compra pendiente; por ahora
                // deriva al contacto con el propietario.
                <Button variant="primary" block onClick={handleContact}>
                  Hacer oferta
                </Button>
              ) : (
                <Button variant="primary" block onClick={handleRent}>
                  Solicitar alquiler
                </Button>
              )}
              <Button variant="secondary" block onClick={handleContact}>
                Contactar al dueño
              </Button>
            </div>

            <div className="det-owner">
              <span className="det-owner__avatar" aria-hidden="true">
                <UserIcon />
              </span>
              <div>
                <div className="det-owner__name">Propietario</div>
                {/* TODO(#138): perfil del propietario (nombre, tiempo de respuesta). */}
                <div className="det-owner__role">Publica en TerraShare</div>
              </div>
            </div>

            <div className="det-map">
              <PanamaMap lands={[land]} selectedLand={land} onSelectLand={() => {}} />
            </div>

            {isSale ? (
              <p className="det-note">
                La compra se cierra ante notaría. TerraShare conecta a las partes y gestiona la reserva.
              </p>
            ) : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}
