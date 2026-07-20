import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useClerk, useUser } from "@clerk/clerk-react";
import { Navbar } from "./ui";
import type { BuscoOfrezcoMode } from "./ui";
import ThemeToggle from "./ThemeToggle";
import { getDisplayName, isAdminUser } from "./authDisplay";
import type { UserMenuItem } from "./ui";
import "../pages/app-shell.css";

const MODE_STORAGE_KEY = "terrashare-mode";

export interface AppLayoutContext {
  mode: BuscoOfrezcoMode;
  setMode: (mode: BuscoOfrezcoMode) => void;
}

const AppModeContext = createContext<AppLayoutContext | null>(null);

/** Modo Busco/Ofrezco compartido por la Navbar y las páginas hijas. */
export function useAppMode(): AppLayoutContext {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error("useAppMode debe usarse dentro de <AppLayout>");
  return ctx;
}

function readStoredMode(): BuscoOfrezcoMode {
  const stored = typeof window !== "undefined" ? window.localStorage.getItem(MODE_STORAGE_KEY) : null;
  return stored === "ofrezco" ? "ofrezco" : "busco";
}

function BrandMark() {
  return (
    <Link to="/dashboard" className="ds-navbar__brand" aria-label="TerraShare, inicio">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6" />
      </svg>
      TerraShare
    </Link>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export default function AppLayout({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [mode, setModeState] = useState<BuscoOfrezcoMode>(readStoredMode);

  const setMode = (next: BuscoOfrezcoMode) => {
    setModeState(next);
    // TODO(#137): persistir el modo (Busco/Ofrezco) en el perfil del usuario.
    // Por ahora se guarda localmente para que sobreviva a recargas.
    window.localStorage.setItem(MODE_STORAGE_KEY, next);
  };

  const context: AppLayoutContext = { mode, setMode };

  const userMenuItems: UserMenuItem[] = [
    { label: "Mi perfil", onClick: () => navigate({ to: "/dashboard/profile" }) },
    { label: "Mis terrenos", onClick: () => navigate({ to: "/dashboard/lands" }) },
    { label: "Visitas", onClick: () => navigate({ to: "/dashboard/visits" }) },
    { label: "Búsquedas", onClick: () => navigate({ to: "/dashboard/saved-searches" }) },
    { label: "Pagos", onClick: () => navigate({ to: "/dashboard/payments" }) },
  ];
  // El acceso al panel admin solo se ofrece a cuentas admin (issue #251).
  if (isAdminUser(user)) {
    userMenuItems.push({ label: "Panel admin", onClick: () => navigate({ to: "/dashboard/admin" }) });
  }

  const actions = (
    <>
      <ThemeToggle className="ds-navbar__icon" />
      <Link to="/dashboard/notifications" className="ds-navbar__icon" aria-label="Notificaciones">
        <BellIcon />
      </Link>
      <Link to="/dashboard/chats" className="ds-navbar__icon" aria-label="Chats">
        <ChatIcon />
      </Link>
    </>
  );

  return (
    <div className="app-shell">
      <a href="#contenido" className="ts-skip-link">Saltar al contenido</a>
      <Navbar
        brand={<BrandMark />}
        mode={mode}
        onModeChange={setMode}
        userName={getDisplayName(user)}
        actions={actions}
        userMenuItems={userMenuItems}
        onSignOut={() => signOut({ redirectUrl: "/" })}
      />
      <main id="contenido" className="app-main">
        <AppModeContext.Provider value={context}>{children}</AppModeContext.Provider>
      </main>
    </div>
  );
}
