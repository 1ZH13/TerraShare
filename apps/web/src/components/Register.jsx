import { Link, useNavigate } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";

export default function Register() {
  const { openSignUp } = useClerk();
  const navigate = useNavigate();

  const handleSignUp = (strategy) => {
    openSignUp({
      redirectUrl: "/dashboard",
      afterInstantiation: () => {
        navigate("/dashboard");
      },
    });
  };

  return (
    <div className="page-shell">
      <div className="glass-panel" style={{ marginTop: "2rem", maxWidth: "400px", margin: "2rem auto" }}>
        <div className="section-header compact">
          <h1>Crear cuenta</h1>
          <p>Unete a TerraShare</p>
        </div>

        <div className="btn-stack">
          <button className="btn btn-primary btn-full" onClick={() => handleSignUp("oauth_google")}>
            Continuar con Google
          </button>
          <button className="btn btn-ghost btn-full" onClick={() => handleSignUp("oauth_microsoft")}>
            Continuar con Microsoft
          </button>
          <button className="btn btn-ghost btn-full" onClick={() => handleSignUp("email")}>
            Continuar con email
          </button>
        </div>

        <div className="auth-link">
          <p>
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="auth-link-text">Inicia sesion</Link>
          </p>
        </div>

        <div className="back-link">
          <Link to="/" className="back-link-text">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}