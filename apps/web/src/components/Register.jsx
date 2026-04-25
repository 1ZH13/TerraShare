import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";

export default function Register() {
  const { openSignUp } = useClerk();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const utmSource = searchParams.get("utm_source");
    if (utmSource) {
      sessionStorage.setItem("terrashare_utm_source", utmSource);
    }
  }, [searchParams]);

  const handleSignUp = (strategy) => {
    const utmSource = sessionStorage.getItem("terrashare_utm_source");
    openSignUp({
      redirectUrl: "/dashboard",
      afterInstantiation: () => {
        navigate("/dashboard");
      },
      ...(utmSource && { unsafeMetadata: { utm_source: utmSource } }),
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