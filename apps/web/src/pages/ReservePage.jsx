import { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { getLandById, createRentalRequest, adaptLand } from "../services/api";
import PublicHeader from "../components/PublicHeader";
import { normalizeReserveLand } from "../data/lands";

const USO_OPCIONES = [
  { value: "", label: "Selecciona un uso" },
  { value: "agricultura", label: "Agricultura" },
  { value: "ganaderia", label: "Ganaderia" },
  { value: "forestal", label: "Forestal" },
  { value: "acuicultura", label: "Acuicultura" },
  { value: "mixto", label: "Uso mixto" },
  { value: "otro", label: "Otro" },
];

export default function ReservePage() {
  const { landId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn } = useUser();

  const [land, setLand] = useState(normalizeReserveLand(location.state?.land) ?? null);
  const [loading, setLoading] = useState(!land);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    intendedUse: "",
    notes: "",
  });

  useEffect(() => {
    if (land) {
      return;
    }

    if (landId) {
      let active = true;
      setLoading(true);
      getLandById(landId)
        .then((raw) => {
          if (active) setLand(normalizeReserveLand(adaptLand(raw)));
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

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
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
        landId,
        period: { startDate: form.startDate, endDate: form.endDate },
        intendedUse: form.intendedUse,
        notes: form.notes || undefined,
      });

      setSuccess(`Solicitud enviada. ID: ${result?.id ?? "—"}. Espera la respuesta del propietario.`);
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 2500);
    } catch (err) {
      setError(err.message || "Error al enviar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="panel" style={{ textAlign: "center", padding: "3rem" }}>
          <p>Cargando terreno...</p>
        </div>
      </div>
    );
  }

  if (!land) {
    return (
      <div className="page-shell">
        <div className="panel" style={{ textAlign: "center", padding: "3rem" }}>
          <h2>Terreno no encontrado</h2>
          <Link to="/catalog" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
            Volver al catalogo
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
        <Link to={`/lands/${landId}`} className="btn btn-ghost" style={{ marginBottom: "1rem" }}>
          &larr; Volver al terreno
        </Link>

        <div className="split-grid" style={{ gap: "1rem", alignItems: "start" }}>
          {/* Info del terreno */}
          <div className="panel">
            <span className="card-badge">{land.type}</span>
            <h1 style={{ margin: "0.5rem 0" }}>{land.title}</h1>
            <p style={{ opacity: 0.8 }}>
              {land.province}{land.district ? `, ${land.district}` : ""}
            </p>
            <dl style={{ marginTop: "1rem" }}>
              <dt>Area</dt>
              <dd>{land.areaHectares} ha</dd>
              <dt>Precio</dt>
              <dd>{land.monthlyPrice > 0 ? `$${land.monthlyPrice}/mes` : "Variable"}</dd>
              <dt>Disponible desde</dt>
              <dd>
                {land.availableFrom
                  ? new Date(land.availableFrom).toLocaleDateString("es-PA")
                  : "Ahora"}
              </dd>
            </dl>
          </div>

          {/* Formulario */}
          <div className="panel">
            <h2 style={{ margin: "0 0 1.25rem" }}>Solicitud de alquiler</h2>

            {success ? (
              <div className="toast toast-success">
                <strong>Solicitud enviada!</strong>
                <p>{success}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="form-grid">
                <label>
                  Fecha de inicio *
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => handleChange("startDate", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    required
                    disabled={submitting}
                  />
                </label>

                <label>
                  Fecha de fin *
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => handleChange("endDate", e.target.value)}
                    min={form.startDate || new Date().toISOString().split("T")[0]}
                    required
                    disabled={submitting}
                  />
                </label>

                <label className="full-width">
                  Uso que le dare al terreno *
                  <select
                    value={form.intendedUse}
                    onChange={(e) => handleChange("intendedUse", e.target.value)}
                    required
                    disabled={submitting}
                  >
                    {USO_OPCIONES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>

                <label className="full-width">
                  Mensaje al propietario (opcional)
                  <textarea
                    value={form.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    placeholder="Cuentale sobre tu proyecto o necesidades..."
                    rows={4}
                    disabled={submitting}
                  />
                </label>

                {error && (
                  <div className="toast toast-error full-width">
                    <strong>Error</strong>
                    <p>{error}</p>
                  </div>
                )}

                <div className="full-width" style={{ marginTop: "0.5rem" }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                    style={{ width: "100%" }}
                  >
                    {submitting ? "Enviando..." : "Enviar solicitud"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
