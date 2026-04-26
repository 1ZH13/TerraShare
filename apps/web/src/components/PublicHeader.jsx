import { Link, useLocation, useNavigate } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import { getDisplayName } from "./authDisplay";

export default function PublicHeader() {
  const { openSignIn, openSignUp, signOut } = useClerk();
  const { isSignedIn, user } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const userName = getDisplayName(user);

  const handleSignIn = () => {
    openSignIn({ redirectUrl: "/dashboard" });
  };

  const handleSignUp = () => {
    openSignUp({ redirectUrl: "/dashboard" });
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
