import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { ArrowLeft, Sprout, MapPin, Info, Check } from "lucide-react";
import { getLandById, createRentalRequest, adaptLand } from "../services/api";
import { normalizeReserveLand } from "../data/lands";
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

interface ReserveLand {
  id?: string;
  type?: string;
  title?: string;
  province?: string;
  district?: string;
  areaHectares?: number;
  monthlyPrice?: number;
  availableFrom?: string;
  features?: string[];
}

interface ReserveForm {
  startDate: string;
  endDate: string;
  intendedUse: string;
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
  const { landId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn } = useUser();

  const [land, setLand] = useState<ReserveLand | null>(
    (normalizeReserveLand(location.state?.land) as ReserveLand | null) ?? null,
  );
  const [loading, setLoading] = useState(!land);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<ReserveForm>({
    startDate: "",
    endDate: "",
    intendedUse: "",
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isSignedIn && !import.meta.env.DEV) {
      navigate("/login", { state: { from: { pathname: location.pathname } }, replace: true });
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
        period: { startDate: form.startDate, endDate: form.endDate },
        intendedUse: form.intendedUse,
        notes: form.notes || undefined,
      });

      setSuccess(`El propietario revisará tu solicitud pronto. ID: ${result?.id ?? "—"}.`);
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  };

  const Nav = (
    <nav className="rsv-nav">
      <Link to={landId ? `/lands/${landId}` : "/catalog"} className="rsv-nav__back">
        <ArrowLeft size={17} /> Volver al terreno
      </Link>
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
            <div className="rsv-summary__photo" aria-hidden="true">
              <MapPin size={30} strokeWidth={1.4} />
            </div>
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
                {(land.monthlyPrice ?? 0) > 0 ? (
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
          <h1 className="rsv-title">Solicitar alquiler</h1>
          <p className="rsv-sub">Completa los datos para enviar tu solicitud al propietario.</p>

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
                  <select
                    id="intendedUse"
                    className="rsv-input"
                    value={form.intendedUse}
                    onChange={(e) => handleChange("intendedUse", e.target.value)}
                    required
                    disabled={submitting}
                  >
                    {USO_OPCIONES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rsv-field">
                  <label className="rsv-label" htmlFor="notes">
                    Mensaje al propietario
                  </label>
                  <textarea
                    id="notes"
                    className="rsv-input"
                    value={form.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    placeholder="Preséntate y cuéntale sobre tu proyecto…"
                    rows={4}
                    disabled={submitting}
                  />
                </div>

                {error && <div className="rsv-error">{error}</div>}

                <div className="rsv-actions">
                  <button type="submit" className="rsv-submit" disabled={submitting}>
                    {submitting ? "Enviando…" : "Enviar solicitud"}
                  </button>
                  <Link to={landId ? `/lands/${landId}` : "/catalog"} className="rsv-cancel">
                    Cancelar
                  </Link>
                </div>

                <p className="rsv-note">
                  <Info size={15} /> El propietario recibirá tu solicitud y podrá aceptarla o
                  rechazarla. No se cobra nada hasta que sea aprobada.
                </p>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
