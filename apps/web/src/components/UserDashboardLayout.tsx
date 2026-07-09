import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useClerk, useUser } from "@clerk/clerk-react";
import { Bell, MessageCircle, Sprout } from "lucide-react";
import { Navbar } from "./ui";
import { getDisplayName } from "./authDisplay";
import "../pages/app-shell.css";

interface UserDashboardLayoutProps {
  children?: ReactNode;
  onSignOut?: () => void;
}

function BrandMark() {
  return (
    <Link to="/dashboard" className="ds-navbar__brand" aria-label="TerraShare, inicio">
      <Sprout size={22} strokeWidth={1.8} />
      TerraShare
    </Link>
  );
}

/** Layout editorial de las páginas de cuenta (terrenos, chats, notificaciones,
 *  pagos, perfil). Reutiliza la Navbar del sistema para igualar al AppLayout,
 *  sin el switch Busco/Ofrezco. */
export default function UserDashboardLayout({ children, onSignOut }: UserDashboardLayoutProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();

  const handleSignOut = onSignOut ?? (() => signOut({ redirectUrl: "/" }));

  const actions = (
    <>
      <Link to="/dashboard/notifications" className="ds-navbar__icon" aria-label="Notificaciones">
        <Bell size={20} />
      </Link>
      <Link to="/dashboard/chats" className="ds-navbar__icon" aria-label="Chats">
        <MessageCircle size={20} />
      </Link>
    </>
  );

  return (
    <div className="app-shell">
      <Navbar
        brand={<BrandMark />}
        userName={getDisplayName(user)}
        actions={actions}
        userMenuItems={[
          { label: "Mi perfil", onClick: () => navigate({ to: "/dashboard/profile" }) },
          { label: "Mis solicitudes", onClick: () => navigate({ to: "/dashboard" }) },
          { label: "Mis terrenos", onClick: () => navigate({ to: "/dashboard/lands" }) },
          { label: "Contratos", onClick: () => navigate({ to: "/dashboard/contracts" }) },
          { label: "Pagos", onClick: () => navigate({ to: "/dashboard/payments" }) },
          { label: "Privacidad", onClick: () => navigate({ to: "/dashboard/privacy" }) },
        ]}
        onSignOut={handleSignOut}
      />
      <main className="app-main">{children}</main>
    </div>
  );
}
