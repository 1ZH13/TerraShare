import { Link, useLocation, useNavigate } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import { getDisplayName } from "./authDisplay";

export default function UserDashboardLayout({ children, onSignOut }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { user } = useUser();
  const userName = getDisplayName(user);

  const handleSignOut = async () => {
    await signOut({ redirectUrl: "/" });
  };

  const navLinks = [
    { to: "/dashboard", label: "Mis solicitudes" },
    { to: "/dashboard/lands", label: "Mis terrenos" },
    { to: "/dashboard/chats", label: "Chats" },
    { to: "/dashboard/notifications", label: "Notificaciones" },
    { to: "/dashboard/payments", label: "Pagos" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="page-shell">
      <nav className="glass-nav">
        <Link to="/" className="brand-logo">
          <img src="/terrashare.svg" alt="TerraShare" className="logo-img" />
        </Link>
        <nav className="menu">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={isActive(link.to) ? "active" : ""}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="auth-actions">
          <button className="settings-icon" onClick={() => navigate("/dashboard/profile")} title="Configuración">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}