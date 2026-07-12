import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useClerk } from "@clerk/clerk-react";
import { LayoutDashboard, Flag, Map, Users, Mail, LogOut, Sprout, ScrollText, Activity, Scale, CreditCard } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import "../pages/admin.css";

interface AdminLayoutProps {
  children?: ReactNode;
  onSignOut?: () => void;
}

const NAV = [
  { to: "/dashboard/admin", label: "Resumen", icon: LayoutDashboard },
  { to: "/dashboard/admin/reports", label: "Reportes", icon: Flag },
  { to: "/dashboard/admin/lands", label: "Terrenos", icon: Map },
  { to: "/dashboard/admin/users", label: "Usuarios", icon: Users },
  { to: "/dashboard/admin/leads", label: "Leads", icon: Mail },
  { to: "/dashboard/admin/payments", label: "Pagos", icon: CreditCard },
  { to: "/dashboard/admin/reconciliation", label: "Conciliación", icon: Scale },
  { to: "/dashboard/admin/audit", label: "Auditoria", icon: ScrollText },
  { to: "/dashboard/admin/observability", label: "Observabilidad", icon: Activity },
];

/** Layout editorial del panel admin: sidebar oscuro + contenido. Sustituye al
 *  layout legacy que estaba inline en App.tsx. */
export default function AdminLayout({ children, onSignOut }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useClerk();

  const handleSignOut = onSignOut ?? (() => signOut({ redirectUrl: "/" }));
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="adm">
      <aside className="adm-side">
        <Link to="/dashboard/admin" className="adm-side__brand">
          <Sprout size={24} strokeWidth={1.8} />
          <span className="adm-side__brand-name">Admin</span>
        </Link>

        <nav className="adm-side__nav">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={`adm-side__link ${isActive(to) ? "is-active" : ""}`}>
              <Icon size={17} /> {label}
            </Link>
          ))}
          <button
            type="button"
            className="adm-side__link"
            style={{ background: "transparent", border: 0, cursor: "pointer", textAlign: "left", font: "inherit" }}
            onClick={() => navigate({ to: "/dashboard" })}
          >
            <Sprout size={17} /> Ver como usuario
          </button>
        </nav>

        <div className="adm-side__foot">
          <ThemeToggle className="adm-side__theme" />
          <button type="button" className="adm-side__signout" onClick={handleSignOut}>
            <LogOut size={17} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="adm-main">{children}</main>
    </div>
  );
}
