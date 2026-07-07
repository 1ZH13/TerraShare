import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SignIn } from "@clerk/clerk-react";
import "../pages/auth.css";

function LeafMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </svg>
  );
}

export default function Login() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const utmSource = searchParams.get("utm_source");
    if (utmSource) {
      sessionStorage.setItem("terrashare_utm_source", utmSource);
    }
  }, [searchParams]);

  return (
    <div className="au-shell">
      <Link to="/" className="au-brand" aria-label="TerraShare, inicio">
        <LeafMark />
        TerraShare
      </Link>

      <div className="au-intro">
        <h1 className="ts-title">Entra a tu cuenta</h1>
        <p>Inicia sesión para continuar en TerraShare.</p>
      </div>

      {/* Clerk maneja Google / correo; el tema editorial se aplica vía
          `appearance` en el ClerkProvider (main.tsx). Routing "virtual" para
          embeber sin necesidad de una ruta comodín. El destino tras iniciar
          sesión lo resuelve `signInFallbackRedirectUrl` del provider. */}
      <div className="au-widget">
        <SignIn routing="virtual" signUpUrl="/register" />
      </div>

      <p className="au-note">Autenticación con Clerk</p>
      <Link to="/" className="au-back">
        ← Volver al inicio
      </Link>
    </div>
  );
}
