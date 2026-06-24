import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { getLandById, createRentalRequest, adaptLand } from "../services/api";
import PublicHeader from "../components/PublicHeader";
import { normalizeReserveLand } from "../data/lands";

const USO_OPCIONES = [
  { value: "", label: "¿Qué uso le darás?" },
  { value: "agricultura", label: "🌱 Agricultura" },
  { value: "ganaderia", label: "🐄 Ganadería" },
  { value: "forestal", label: "🌲Forestal" },
  { value: "acuicultura", label: "🐟 Acuicultura" },
  { value: "mixto", label: "🔄 Uso mixto" },
  { value: "otro", label: "📋 Otro" },
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
      return () => { active = false; };
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

      setSuccess(`¡Solicitud enviada! El propietario la revisará pronto. ID: ${result?.id ?? "—"}.`);
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="reserve-loading">
          <div className="reserve-spinner" />
          <p>Cargando información del terreno...</p>
        </div>
      </div>
    );
  }

  if (!land) {
    return (
      <div className="page-shell">
        <div className="glass-panel" style={{ textAlign: "center", padding: "3rem" }}>
          <h2>Terreno no encontrado</h2>
          <Link to="/catalog" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" aria-hidden="true" />
      <div className="ambient ambient-right" aria-hidden="true" />

      <PublicHeader showDashboardLink={false} />

      <main>
        <Link to={`/lands/${landId}`} className="back-link-text">
          ← Volver al terreno
        </Link>

        <div className="reserve-layout">
          <aside className="reserve-sidebar">
            <div className="reserve-land-card">
              <span className="card-badge">{land.type}</span>
              <h2 className="reserve-land-title">{land.title}</h2>
              <p className="reserve-land-location">
                {land.province}{land.district ? `, ${land.district}` : ""}
              </p>

              <div className="reserve-price-block">
                <span className="reserve-price-value">
                  {(land.monthlyPrice ?? 0) > 0 ? `$${land.monthlyPrice}` : "Precio variable"}
                </span>
                {(land.monthlyPrice ?? 0) > 0 && <span className="reserve-price-period">/mes</span>}
              </div>

              <div className="reserve-stats">
                <div className="reserve-stat">
                  <span className="reserve-stat-value">{land.areaHectares} ha</span>
                  <span className="reserve-stat-label">Área</span>
                </div>
                <div className="reserve-stat">
                  <span className="reserve-stat-value">
                    {land.availableFrom
                      ? new Date(land.availableFrom).toLocaleDateString("es-PA", { month: "short", year: "numeric" })
                      : "Ahora"}
                  </span>
                  <span className="reserve-stat-label">Disponible</span>
                </div>
              </div>

              {(land.features ?? []).length > 0 && (
                <div className="reserve-features">
                  <span className="reserve-features-title">Características</span>
                  <div className="reserve-features-list">
                    {(land.features ?? []).map((f: string) => (
                      <span key={f} className="reserve-feature">{f}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          <section className="reserve-main">
            <div className="glass-panel reserve-form-card">
              <div className="reserve-form-header">
                <h1>Solicitar alquiler</h1>
                <p>Completa los datos para enviar tu solicitud al propietario</p>
              </div>

              {success ? (
                <div className="reserve-success">
                  <div className="reserve-success-icon">✓</div>
                  <h2>¡Solicitud enviada!</h2>
                  <p>{success}</p>
                  <p className="reserve-success-hint">Redirigiendo al dashboard...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="reserve-form">
                  <div className="reserve-field-row">
                    <div className="reserve-field">
                      <label htmlFor="startDate">Fecha de inicio</label>
                      <input
                        id="startDate"
                        type="date"
                        value={form.startDate}
                        onChange={(e) => handleChange("startDate", e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div className="reserve-field">
                      <label htmlFor="endDate">Fecha de fin</label>
                      <input
                        id="endDate"
                        type="date"
                        value={form.endDate}
                        onChange={(e) => handleChange("endDate", e.target.value)}
                        min={form.startDate || new Date().toISOString().split("T")[0]}
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="reserve-field">
                    <label htmlFor="intendedUse">Uso del terreno</label>
                    <select
                      id="intendedUse"
                      value={form.intendedUse}
                      onChange={(e) => handleChange("intendedUse", e.target.value)}
                      required
                      disabled={submitting}
                    >
                      {USO_OPCIONES.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="reserve-field">
                    <label htmlFor="notes">Mensaje al propietario</label>
                    <textarea
                      id="notes"
                      value={form.notes}
                      onChange={(e) => handleChange("notes", e.target.value)}
                      placeholder="Preséntate y cuéntale sobre tu proyecto..."
                      rows={4}
                      disabled={submitting}
                    />
                  </div>

                  {error && (
                    <div className="toast toast-error">
                      <strong>Error</strong>
                      <p>{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary btn-full reserve-submit"
                    disabled={submitting}
                  >
                    {submitting ? "Enviando..." : "Enviar solicitud"}
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}