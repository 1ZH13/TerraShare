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
