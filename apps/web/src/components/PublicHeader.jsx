import { Link, useLocation } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import { getDisplayName, isAdminUser } from "./authDisplay";

export default function PublicHeader({ showDashboardLink = true }) {
  const { openSignIn, openSignUp, signOut } = useClerk();
  const { isSignedIn, user } = useUser();
  const location = useLocation();
  const userName = getDisplayName(user);
  const admin = isAdminUser(user);
  const canShowDashboard = showDashboardLink && (import.meta.env.DEV || admin || isSignedIn);

  const handleSignIn = () => {
    openSignIn({ redirectUrl: location.pathname || "/dashboard/admin" });
  };

  const handleSignUp = () => {
    openSignUp({ redirectUrl: location.pathname || "/dashboard/admin" });
  };

  const handleSignOut = async () => {
    await signOut({ redirectUrl: "/" });
  };

  return (
    <header className="glass-nav">
      <Link to="/" className="brand">TerraShare</Link>
      <nav className="menu">
        <Link to="/catalog">Terrenos</Link>
        {canShowDashboard && <Link to="/dashboard/admin">Dashboard</Link>}
      </nav>
      <div className="auth-actions">
        {isSignedIn ? (
          <>
            <span className="user-chip">{userName}</span>
            {canShowDashboard && <Link to="/dashboard/admin" className="btn btn-ghost">Ir al dashboard</Link>}
            <button className="btn btn-ghost" onClick={handleSignOut}>Cerrar sesión</button>
          </>
        ) : (
          <>
            {canShowDashboard && <Link to="/dashboard/admin" className="btn btn-ghost">Panel admin</Link>}
            <button className="btn btn-ghost" onClick={handleSignIn}>Iniciar sesión</button>
            <button className="btn btn-primary" onClick={handleSignUp}>Crear cuenta</button>
          </>
        )}
      </div>
    </header>
  );
}
