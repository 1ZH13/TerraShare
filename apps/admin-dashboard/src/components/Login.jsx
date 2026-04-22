import { Link } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";

export default function Login() {
  const { openSignIn } = useClerk();

  const handleLogin = () => {
    openSignIn({
      redirectUrl: "/admin",
    });
  };

  return (
    <div className="page-shell">
      <div className="panel slim-panel" style={{ marginTop: "2rem", maxWidth: "400px" }}>
        <div className="section-header compact">
          <h1>Admin TerraShare</h1>
          <p>Inicia sesión con tu cuenta de administrador</p>
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <button 
            className="btn btn-primary" 
            onClick={handleLogin}
            style={{ width: "100%", marginBottom: "1rem" }}
          >
            Continuar con Google
          </button>
          
          <button 
            className="btn btn-ghost" 
            onClick={handleLogin}
            style={{ width: "100%", marginBottom: "1rem" }}
          >
            Continuar con Microsoft
          </button>
          
          <button 
            className="btn btn-ghost" 
            onClick={handleLogin}
            style={{ width: "100%" }}
          >
            Continuar con email
          </button>
        </div>

        <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid rgba(19,33,24,0.1)" }}>
          <Link to="/" style={{ color: "var(--leaf-900)" }}>
            ← Volver al sitio
          </Link>
        </div>
      </div>
    </div>
  );
}