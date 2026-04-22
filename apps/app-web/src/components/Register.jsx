import { Link } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";

export default function Register() {
  const { openSignUp } = useClerk();

  return (
    <div className="page-shell">
      <div className="panel slim-panel" style={{ marginTop: "2rem" }}>
        <div className="section-header compact">
          <h1>Crear cuenta</h1>
          <p>Únete a TerraShare para publicar terrenos y gestionar alquileres</p>
        </div>

        <div className="form-grid" style={{ marginTop: "1.5rem" }}>
          <button 
            className="btn btn-primary" 
            onClick={() => openSignUp({})}
            style={{ width: "100%", marginBottom: "1rem" }}
          >
            Continuar con Google
          </button>
          
          <button 
            className="btn btn-ghost" 
            onClick={() => openSignUp({})}
            style={{ width: "100%", marginBottom: "1rem" }}
          >
            Continuar con Microsoft
          </button>
          
          <button 
            className="btn btn-ghost" 
            onClick={() => openSignUp({})}
            style={{ width: "100%" }}
          >
            Continuar con email
          </button>
        </div>

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <p style={{ margin: 0, opacity: 0.8 }}>
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" style={{ color: "var(--leaf-900)", fontWeight: 700 }}>
              Inicia sesión
            </Link>
          </p>
        </div>

        <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid rgba(19,33,24,0.1)" }}>
          <p style={{ margin: 0, opacity: 0.6, fontSize: "0.875rem" }}>
            <Link to="/" style={{ color: "var(--leaf-900)" }}>
              ← Volver al catálogo
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}