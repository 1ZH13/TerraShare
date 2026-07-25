import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Link, useParams, useNavigate, useLocation, useSearch } from "@tanstack/react-router";
import { useUser } from "@clerk/clerk-react";
import { Sprout, MapPin, Info, Check } from "lucide-react";
import { getLandById, createRentalRequest, adaptLand, photoSrc } from "../services/api";
import BackLink from "../components/BackLink";
import "./reserve.css";

const USO_OPCIONES = [
  { value: "", label: "¿Qué uso le darás?" },
  { value: "agricultura", label: "Agricultura" },
  { value: "ganaderia", label: "Ganadería" },
  { value: "forestal", label: "Forestal" },
  { value: "acuicultura", label: "Acuicultura" },
  { value: "mixto", label: "Uso mixto" },
  { value: "otro", label: "Otro" },
];

type Operation = "alquiler" | "venta" | "ambas";

interface ReserveLand {
  id?: string;
  type?: string;
  title?: string;
  /** Usos que el dueño permite. El backend rechaza cualquier otro (#419). */
  allowedUses?: string[];
  province?: string;
  district?: string;
  areaHectares?: number;
  monthlyPrice?: number;
  operation?: Operation;
  salePrice?: number;
  availableFrom?: string;
  features?: string[];
  /** Fotos del terreno; se muestra la portada en el resumen (#446). */
  photos?: string[];
}

type LandLike = Record<string, unknown> & {
  id?: string;
  type?: string;
  title?: string;
  allowedUses?: string[];
  province?: string;
  district?: string;
  location?: { province?: string; district?: string };
  areaHectares?: number;
  area?: number;
  monthlyPrice?: number;
  priceRule?: { pricePerMonth?: number };
  operation?: Operation;
  salePrice?: number;
  availableFrom?: string;
  availability?: { availableFrom?: string };
  features?: string[];
  photos?: string[];
};

function labelForUse(use: string | undefined): string {
  if (!use) return "";
  return USO_OPCIONES.find((o) => o.value === use)?.label ?? use;
}

// Normaliza un terreno (crudo de la API vía adaptLand, o pasado por router state)
// a la forma que consume esta pantalla. Antes vivía en el mock data/lands (#138).
function normalizeReserveLand(land: LandLike | null | undefined): ReserveLand | null {
  if (!land) return null;
  return {
    id: land.id,
    type: land.type ?? labelForUse(land.allowedUses?.[0]),
    allowedUses: land.allowedUses,
    title: land.title,
    province: land.province ?? land.location?.province ?? "",
    district: land.district ?? land.location?.district ?? "",
    areaHectares: land.areaHectares ?? land.area ?? 0,
    monthlyPrice: land.monthlyPrice ?? land.priceRule?.pricePerMonth ?? 0,
    operation: land.operation ?? "alquiler",
    salePrice: land.salePrice,
    availableFrom: land.availableFrom ?? land.availability?.availableFrom ?? "",
    features: land.features,
    photos: land.photos,
  };
}

interface ReserveForm {
  startDate: string;
  endDate: string;
  intendedUse: string;
  offerAmount: string;
  notes: string;
}

function BrandMark() {
  return (
    <span className="rsv-nav__brand">
      <span className="rsv-nav__brand-mark">
        <Sprout size={22} strokeWidth={1.8} />
      </span>
      <span className="rsv-nav__brand-name">TerraShare</span>
    </span>
  );
}

export default function ReservePage() {
  const { landId } = useParams({ strict: false });
  const navigate = useNavigate();
  const location = useLocation();
  // Intención explícita para terrenos «ambas»: la fija el detalle (#428).
  const { modo } = useSearch({ strict: false }) as { modo?: "alquiler" | "venta" };
  const { isSignedIn } = useUser();

  const [land, setLand] = useState<ReserveLand | null>(
    (normalizeReserveLand((location.state as { land?: Parameters<typeof normalizeReserveLand>[0] })?.land) as ReserveLand | null) ?? null,
  );
  const [loading, setLoading] = useState(!land);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<ReserveForm>({
    startDate: "",
    endDate: "",
    intendedUse: "",
    offerAmount: "",
    notes: "",
  });

  useEffect(() => {
    if (land) return;

    if (landId) {
      let active = true;
      setLoading(true);
      getLandById(landId)
        .then((raw) => {
          if (active) setLand(normalizeReserveLand(adaptLand(raw)) as ReserveLand | null);
        })
        .catch(() => {
          if (active) setError("No se pudo cargar el terreno.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }
  }, [land, landId]);

  const handleChange = (field: keyof ReserveForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  // Usos que el terreno admite. El desplegable se limita a estos: ofrecer todos
  // engañaba, porque el backend rechaza con 422 cualquiera fuera de la lista
  // que fijó el dueño (#419).
  const allowedUses = land?.allowedUses ?? [];

  // Si el terreno permite un solo uso, no hay nada que elegir: se fija solo y el
  // campo pasa a ser informativo. Evita el paso vacío de un desplegable de una
  // sola opción que además es obligatorio.
  useEffect(() => {
    if (allowedUses.length === 1 && form.intendedUse !== allowedUses[0]) {
      setForm((prev) => ({ ...prev, intendedUse: allowedUses[0] }));
    }
  }, [allowedUses, form.intendedUse]);

  // `modo` manda cuando viene (terreno «ambas»); si no, se deduce de la operación
  // del terreno: venta/ambas → oferta de compra, alquiler → solicitud de alquiler.
  const isSale = modo ? modo === "venta" : (land?.operation ?? "alquiler") !== "alquiler";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isSignedIn && !import.meta.env.DEV) {
      navigate({ to: "/login", replace: true });
      return;
    }

    if (isSale) {
      const offer = Number(form.offerAmount);
      if (!Number.isFinite(offer) || offer <= 0) {
        setError("Ingresa un monto de oferta válido.");
        return;
      }

      setSubmitting(true);
      setError("");
      try {
        const result = await createRentalRequest({
          landId: landId!,
          operation: "venta",
          offerAmount: offer,
          notes: form.notes || undefined,
        });
        setSuccess(`El propietario revisará tu solicitud pronto. ID: ${result?.id ?? "—"}.`);
        setTimeout(() => navigate({ to: "/dashboard", replace: true }), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al enviar la oferta.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!form.startDate || !form.endDate || !form.intendedUse) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    const start = Date.parse(form.startDate);
    const end = Date.parse(form.endDate);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      setError("La fecha de fin debe ser posterior a la de inicio.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await createRentalRequest({
        landId: landId!,
        operation: "alquiler",
        period: { startDate: form.startDate, endDate: form.endDate },
        intendedUse: form.intendedUse,
        notes: form.notes || undefined,
      });

      setSuccess(`El propietario revisará tu solicitud pronto. ID: ${result?.id ?? "—"}.`);
      setTimeout(() => {
        navigate({ to: "/dashboard", replace: true });
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  };

  const Nav = (
    <nav className="rsv-nav">
      {/* Vuelve por el historial, igual que el detalle, para no apilar entradas y
          entrar en bucle con la flecha del detalle (#444). El respaldo lleva al
          terreno cuando se entra directo (enlace compartido). */}
      <BackLink fallbackTo={landId ? `/lands/${landId}` : "/catalog"} label="Volver al terreno" />
      <BrandMark />
    </nav>
  );

  if (loading) {
    return (
      <div className="rsv">
        {Nav}
        <div className="rsv-state">Cargando información del terreno…</div>
      </div>
    );
  }

  if (!land) {
    return (
      <div className="rsv">
        {Nav}
        <div className="rsv-state">
          <h2>Terreno no encontrado</h2>
          <Link to="/catalog" className="rsv-cancel" style={{ marginTop: "1rem" }}>
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  const available = land.availableFrom
    ? new Date(land.availableFrom).toLocaleDateString("es-PA", { month: "short", year: "numeric" })
    : "Ahora";

  return (
    <div className="rsv">
      {Nav}

      <div className="rsv-wrap">
        {/* resumen del terreno */}
        <aside className="rsv-aside">
          <div className="rsv-summary">
            {land.photos && land.photos.length > 0 ? (
              <div className="rsv-summary__photo rsv-summary__photo--img">
                <img src={photoSrc(land.photos[0])} alt={land.title ?? "Terreno"} />
              </div>
            ) : (
              <div className="rsv-summary__photo" aria-hidden="true">
                <MapPin size={30} strokeWidth={1.4} />
              </div>
            )}
            <div className="rsv-summary__body">
              {land.type && <span className="rsv-summary__badge">{land.type}</span>}
              <div className="rsv-summary__title">{land.title}</div>
              <div className="rsv-summary__loc">
                <MapPin size={14} /> {land.province}
                {land.district ? ` · ${land.district}` : ""}
              </div>
              <div className="rsv-summary__stats">
                <div>
                  <div className="rsv-summary__stat-value">{land.areaHectares ?? "—"} ha</div>
                  <div className="rsv-summary__stat-label">Área</div>
                </div>
                <div>
                  <div className="rsv-summary__stat-value">{available}</div>
                  <div className="rsv-summary__stat-label">Disponible</div>
                </div>
              </div>
              <div className="rsv-summary__price">
                {isSale ? (
                  typeof land.salePrice === "number" && land.salePrice > 0 ? (
                    <>
                      ${land.salePrice.toLocaleString("es-PA")}
                      <span> venta</span>
                    </>
                  ) : (
                    "Precio a consultar"
                  )
                ) : (land.monthlyPrice ?? 0) > 0 ? (
                  <>
                    ${land.monthlyPrice?.toLocaleString("es-PA")}
                    <span>/mes</span>
                  </>
                ) : (
                  "Precio a consultar"
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* formulario */}
        <section>
          <h1 className="rsv-title">{isSale ? "Solicitar compra" : "Solicitar alquiler"}</h1>
          <p className="rsv-sub">
            {isSale
              ? "Propón tu precio de compra y envíalo al propietario."
              : "Completa los datos para enviar tu solicitud al propietario."}
          </p>

          <div className="rsv-card">
            {success ? (
              <div className="rsv-success">
                <div className="rsv-success__icon">
                  <Check size={28} />
                </div>
                <h2>¡Solicitud enviada!</h2>
                <p>{success}</p>
                <p>Redirigiendo al panel…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {isSale ? (
                  <div className="rsv-field">
                    <label className="rsv-label" htmlFor="offerAmount">
                      Tu oferta (USD)
                    </label>
                    <input
                      id="offerAmount"
                      className="rsv-input"
                      type="number"
                      min={1}
                      step={100}
                      value={form.offerAmount}
                      onChange={(e) => handleChange("offerAmount", e.target.value)}
                      placeholder={
                        typeof land.salePrice === "number" && land.salePrice > 0
                          ? `Precio pedido: $${land.salePrice.toLocaleString("es-PA")}`
                          : "Ingresa tu oferta"
                      }
                      required
                      disabled={submitting}
                    />
                  </div>
                ) : (
                  <>
                    <div className="rsv-row">
                      <div className="rsv-field">
                        <label className="rsv-label" htmlFor="startDate">
                          Fecha de inicio
                        </label>
                        <input
                          id="startDate"
                          className="rsv-input"
                          type="date"
                          value={form.startDate}
                          onChange={(e) => handleChange("startDate", e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          required
                          disabled={submitting}
                        />
                      </div>
                      <div className="rsv-field">
                        <label className="rsv-label" htmlFor="endDate">
                          Fecha de fin
                        </label>
                        <input
                          id="endDate"
                          className="rsv-input"
                          type="date"
                          value={form.endDate}
                          onChange={(e) => handleChange("endDate", e.target.value)}
                          min={form.startDate || new Date().toISOString().split("T")[0]}
                          required
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className="rsv-field">
                      <label className="rsv-label" htmlFor="intendedUse">
                        Uso del terreno
                      </label>
                      {allowedUses.length <= 1 ? (
                        // Un solo uso permitido: no se elige, se muestra. El
                        // valor ya lo fijó el efecto de arriba.
                        <div className="rsv-input rsv-input--static" id="intendedUse">
                          {allowedUses.length === 1
                            ? labelForUse(allowedUses[0])
                            : "El dueño no especificó un uso"}
                        </div>
                      ) : (
                        <select
                          id="intendedUse"
                          className="rsv-input"
                          value={form.intendedUse}
                          onChange={(e) => handleChange("intendedUse", e.target.value)}
                          required
                          disabled={submitting}
                        >
                          <option value="">¿Qué uso le darás?</option>
                          {allowedUses.map((u) => (
                            <option key={u} value={u}>
                              {labelForUse(u)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </>
                )}

                <div className="rsv-field">
                  <label className="rsv-label" htmlFor="notes">
                    Mensaje al propietario
                  </label>
                  <textarea
                    id="notes"
                    className="rsv-input"
                    value={form.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    placeholder={
                      isSale
                        ? "Cuéntale por qué te interesa el terreno…"
                        : "Preséntate y cuéntale sobre tu proyecto…"
                    }
                    rows={4}
                    disabled={submitting}
                  />
                </div>

                {error && <div className="rsv-error">{error}</div>}

                <div className="rsv-actions">
                  <button type="submit" className="rsv-submit" disabled={submitting}>
                    {submitting ? "Enviando…" : "Enviar solicitud"}
                  </button>
                  <Link to={landId ? "/lands/$id" : "/catalog"} params={{ id: landId }} className="rsv-cancel">
                    Cancelar
                  </Link>
                </div>

                <p className="rsv-note">
                  <Info size={15} />{" "}
                  {isSale
                    ? "El propietario recibirá tu oferta y podrá aceptarla o rechazarla. No se cobra nada hasta que sea aprobada."
                    : "El propietario recibirá tu solicitud y podrá aceptarla o rechazarla. No se cobra nada hasta que sea aprobada."}
                </p>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
