import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";

export default function Register({ user, onRegister, setToast }) {
  const { openSignUp } = useClerk();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") || "/", [searchParams]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={nextPath} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onRegister(form);
      setToast({ type: "success", message: "Cuenta creada. Ya puedes enviar solicitudes de alquiler." });
      navigate(nextPath, { replace: true });
    } catch (error) {
      setToast({ type: "error", message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel slim-panel reveal" style={{ marginTop: "2rem", maxWidth: "420px" }}>
      <div className="section-header compact">
        <p className="kicker">Registro</p>
        <h1>Crear cuenta</h1>
        <p>Completa tus datos para empezar a explorar y reservar terrenos.</p>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Nombre completo
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
            minLength={3}
          />
        </label>

        <label>
          Correo
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
        </label>

        <label>
          Contrasena
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            required
            minLength={6}
          />
        </label>

        <button type="submit" className="button primary-button" disabled={submitting}>
          {submitting ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <div className="form-grid" style={{ marginTop: "0.85rem" }}>
        <button type="button" className="button ghost-button" onClick={() => openSignUp({})}>
          Crear cuenta con Clerk
        </button>
      </div>

      <p className="top-gap">
        ¿Ya tienes cuenta?{" "}
        <Link to={`/login?next=${encodeURIComponent(nextPath)}`}>Inicia sesion</Link>
      </p>

      <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid rgba(19,33,24,0.1)" }}>
        <Link to="/" style={{ color: "var(--leaf-900)" }}>← Volver al inicio</Link>
      </div>
    </div>
  );
}
