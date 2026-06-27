import { Link, useLocation, useNavigate } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import { getDisplayName } from "./authDisplay";

interface PublicHeaderProps {
  showDashboardLink?: boolean;
}

export default function PublicHeader({ showDashboardLink }: PublicHeaderProps = {}) {
  const { signOut } = useClerk();
  const { isSignedIn, user } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const userName = getDisplayName(user);

  // Navigate to the full /login and /register pages (which host the Clerk
  // forms) instead of popping Clerk's modal overlay.
  const handleSignIn = () => {
    navigate("/login");
  };

  const handleSignUp = () => {
    navigate("/register");
  };

  const handleSignOut = async () => {
    await signOut({ redirectUrl: "/" });
  };

  return (
    <header className="glass-nav">
      <Link to="/" className="brand-logo">
        <img src="/terrashare.svg" alt="TerraShare" className="logo-img" />
        <span className="brand-text">TerraShare</span>
      </Link>
      <div className="auth-actions">
        {isSignedIn ? (
          <>
            <button className="user-chip" onClick={() => navigate("/dashboard/profile")}>
              {userName}
            </button>
            <button className="btn btn-ghost" onClick={handleSignOut}>Cerrar sesión</button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost" onClick={handleSignIn}>Iniciar sesión</button>
            <button className="btn btn-primary" onClick={handleSignUp}>Crear cuenta</button>
          </>
        )}
      </div>
    </header>
  );
}
