import { Link, useNavigate } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";

export default function Login() {
  const { openSignIn } = useClerk();
  const navigate = useNavigate();

  const handleSignIn = (strategy) => {
    openSignIn({
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
          <h1>Iniciar sesion</h1>
          <p>Accede a tu cuenta TerraShare</p>
        </div>

        <div className="btn-stack">
          <button className="btn btn-primary btn-full" onClick={() => handleSignIn("oauth_google")}>
            Continuar con Google
          </button>
          <button className="btn btn-ghost btn-full" onClick={() => handleSignIn("oauth_microsoft")}>
            Continuar con Microsoft
          </button>
          <button className="btn btn-ghost btn-full" onClick={() => handleSignIn("email")}>
            Continuar con email
          </button>
        </div>

        <div className="auth-link">
          <p>
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="auth-link-text">Registrate</Link>
          </p>
        </div>

        <div className="back-link">
          <Link to="/" className="back-link-text">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}