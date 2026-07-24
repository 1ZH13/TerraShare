import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { useUser } from "@clerk/clerk-react";
import { isAdminUser } from "./authDisplay";

function Loading() {
  return (
    <div className="page-shell">
      <div className="panel" style={{ textAlign: "center", padding: "3rem" }}>
        <p>Cargando...</p>
      </div>
    </div>
  );
}

/** Redirige a /login si no hay sesión de Clerk. */
export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { isSignedIn } = useUser();

  if (isSignedIn === false) {
    return <Navigate to="/login" replace />;
  }
  if (isSignedIn === undefined) {
    return <Loading />;
  }
  return <>{children}</>;
}

/**
 * Solo para invitados: `/login` y `/register`. Si ya hay sesión, saca de la
 * pantalla de acceso hacia el panel.
 *
 * El `replace` es la clave de #422: sin guarda, `/login` se quedaba en el
 * historial tras iniciar sesión y, al pulsar «atrás», el `<SignIn>` de Clerk
 * detectaba la sesión y reenviaba adelante, dejando el botón atrás muerto.
 * Reemplazando la entrada, `/login` no queda como destino al que rebotar.
 */
export function GuestRoute({ children }: { children?: ReactNode }) {
  const { isSignedIn } = useUser();

  if (isSignedIn === undefined) {
    return <Loading />;
  }
  if (isSignedIn) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

/** Requiere sesión + rol admin. */
export function AdminRoute({ children }: { children?: ReactNode }) {
  const { isSignedIn, user } = useUser();

  if (isSignedIn === false) {
    return <Navigate to="/login" replace />;
  }
  if (isSignedIn === undefined) {
    return <Loading />;
  }
  if (!isAdminUser(user)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
