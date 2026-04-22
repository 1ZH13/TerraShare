import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";

export default function Login({ user, onLogin, setToast }) {
  const { openSignIn } = useClerk();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") || "/", [searchParams]);
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={nextPath} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onLogin(form);
      setToast({ type: "success", message: "Sesion iniciada correctamente." });
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
        <p className="kicker">Acceso</p>
        <h1>Iniciar sesion</h1>
        <p>Usa una cuenta semilla o crea una cuenta nueva desde registro.</p>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
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
          />
        </label>

        <button type="submit" className="button primary-button" disabled={submitting}>
          {submitting ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <div className="form-grid" style={{ marginTop: "0.85rem" }}>
        <button type="button" className="button ghost-button" onClick={() => openSignIn({})}>
          Acceso con Clerk
        </button>
      </div>

      <p className="muted top-gap">
        Cuentas semilla: tenant@terrashare.test / 123456, owner@terrashare.test / 123456.
      </p>

      <p className="top-gap">
        ¿No tienes cuenta?{" "}
        <Link to={`/register?next=${encodeURIComponent(nextPath)}`}>Registrate</Link>
      </p>

      <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid rgba(19,33,24,0.1)" }}>
        <Link to="/" style={{ color: "var(--leaf-900)" }}>← Volver al inicio</Link>
      </div>
    </div>
  );
}
