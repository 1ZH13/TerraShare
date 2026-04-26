import { useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";

export default function Login() {
  const { openSignIn } = useClerk();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const utmSource = searchParams.get("utm_source");
    if (utmSource) {
      sessionStorage.setItem("terrashare_utm_source", utmSource);
    }
  }, [searchParams]);

  const handleSignIn = () => {
    const fromPath = location.state?.from?.pathname || location.state?.from;
    const hasValidFrom = typeof fromPath === "string" && fromPath.startsWith("/");
    const isAuthRoute = hasValidFrom && (fromPath.startsWith("/login") || fromPath.startsWith("/register"));
    const redirectTarget = hasValidFrom && !isAuthRoute ? fromPath : "/dashboard";
    openSignIn({ redirectUrl: redirectTarget });
  };

  return (
    <div className="page-shell">
      <div className="glass-panel" style={{ marginTop: "2rem", maxWidth: "400px", margin: "2rem auto" }}>
        <div className="section-header compact">
          <h1>Iniciar sesion</h1>
          <p>Accede a tu cuenta TerraShare</p>
        </div>

        <div className="btn-stack">
          <button className="btn btn-primary btn-full" onClick={handleSignIn}>
            Continuar con Google
          </button>
          <button className="btn btn-ghost btn-full" onClick={() => openSignIn({ strategy: "oauth_microsoft", redirectUrl: "/dashboard" })}>
            Continuar con Microsoft
          </button>
          <button className="btn btn-ghost btn-full" onClick={() => openSignIn({ strategy: "email", redirectUrl: "/dashboard" })}>
            Continuar con email
          </button>
        </div>

        <div className="auth-link">
          <p>
            ¿No tienes cuenta?{" "}
            <Link to="/register" state={{ from: location.state?.from }} className="auth-link-text">Registrate</Link>
          </p>
        </div>

        <div className="back-link">
          <Link to="/" className="back-link-text">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
