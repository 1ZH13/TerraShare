import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useClerk } from "@clerk/clerk-react";
import { LayoutDashboard, Flag, Map, Users, Mail, LogOut, Sprout, ScrollText, Activity, Scale, CreditCard, DatabaseBackup, ShieldCheck, TriangleAlert, ArrowRight } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { isMfaLockout } from "../lib/admin-mfa";
import { getSecuritySettings } from "../services/adminApi";
import "../pages/admin.css";

const SECURITY_PATH = "/dashboard/admin/security";

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
  { to: "/dashboard/admin/backups", label: "Respaldos", icon: DatabaseBackup },
  { to: "/dashboard/admin/security", label: "Seguridad", icon: ShieldCheck },
];

/** Layout editorial del panel admin: sidebar oscuro + contenido. Sustituye al
 *  layout legacy que estaba inline en App.tsx. */
export default function AdminLayout({ children, onSignOut }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useClerk();

  const handleSignOut = onSignOut ?? (() => signOut({ redirectUrl: "/" }));
  const isActive = (path: string) => location.pathname === path;

  // Con la exigencia de 2FA activa y sin 2FA en la cuenta, TODAS las pantallas
  // del panel responden 403 y se quedan vacías, sin que nada diga por qué ni
  // dónde se arregla (#394). Lo detectamos aquí, en el layout, para avisar una
  // sola vez y que valga para las once pantallas.
  //
  // Se consulta a `security-settings` porque es la única ruta de `/admin/*` que
  // NO exige 2FA —es la salida de emergencia— y además devuelve las dos piezas
  // que hacen falta: si la exigencia está activa y si nuestro token la trae.
  const [lockedOut, setLockedOut] = useState(false);

  useEffect(() => {
    let active = true;
    getSecuritySettings()
      .then((res) => {
        if (active) setLockedOut(isMfaLockout(res.data));
      })
      .catch(() => {
        // Si ni la salida de emergencia responde, el problema es otro y las
        // pantallas ya muestran el suyo: no añadimos un aviso equivocado.
      });
    return () => {
      active = false;
    };
  }, []);

  // En la propia pantalla de seguridad sobra: ya lo explica con más detalle.
  const showLockoutNotice = lockedOut && location.pathname !== SECURITY_PATH;

  return (
    <div className="adm">
      <aside className="adm-side">
        <Link to="/dashboard/admin" className="adm-side__brand">
          <Sprout size={24} strokeWidth={1.8} />
          <span className="adm-side__brand-name">Admin</span>
        </Link>

        <nav className="adm-side__nav">
          {NAV.map(({ to, label, icon: Icon }) => {
            // Cuando el 2FA cierra el panel, Seguridad es la única entrada que
            // sirve para algo: se señala para que se distinga del resto (#394).
            const isWayOut = lockedOut && to === SECURITY_PATH;
            return (
              <Link
                key={to}
                to={to}
                className={`adm-side__link ${isActive(to) ? "is-active" : ""} ${isWayOut ? "is-wayout" : ""}`}
              >
                <Icon size={17} /> {label}
                {isWayOut ? <span className="adm-side__dot" aria-hidden="true" /> : null}
              </Link>
            );
          })}
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

      <main className="adm-main">
        {showLockoutNotice ? (
          <div className="adm-lockout" role="status">
            <TriangleAlert size={20} className="adm-lockout__icon" />
            <div className="adm-lockout__body">
              <p className="adm-lockout__title">
                El panel te está rechazando: se exige verificación en dos pasos.
              </p>
              <p className="adm-lockout__text">
                Por eso las pantallas aparecen vacías. Tienes dos salidas: activar la 2FA en
                tu cuenta, o desactivar la exigencia. Ambas están en Seguridad, que sigue
                accesible a propósito.
              </p>
            </div>
            <Link to={SECURITY_PATH} className="adm-lockout__cta">
              Ir a Seguridad <ArrowRight size={16} />
            </Link>
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
