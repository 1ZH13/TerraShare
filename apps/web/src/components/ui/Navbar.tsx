import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export type BuscoOfrezcoMode = "busco" | "ofrezco";

export interface UserMenuItem {
  label: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
}

export interface NavbarProps {
  /** Marca a la izquierda; por defecto un enlace "TerraShare" a "/". */
  brand?: ReactNode;
  /** Modo activo del switch Busco / Ofrezco. */
  mode?: BuscoOfrezcoMode;
  /** Si se pasa, se muestra el switch Busco / Ofrezco. */
  onModeChange?: (mode: BuscoOfrezcoMode) => void;
  /** Nombre mostrado en el menú de usuario. Si falta, no se muestra el menú. */
  userName?: string;
  userMenuItems?: UserMenuItem[];
  /** Acción de cerrar sesión (se añade al final del menú de usuario). */
  onSignOut?: () => void;
  className?: string;
}

const MODES: { value: BuscoOfrezcoMode; label: string }[] = [
  { value: "busco", label: "Busco" },
  { value: "ofrezco", label: "Ofrezco" },
];

export default function Navbar({
  brand,
  mode,
  onModeChange,
  userName,
  userMenuItems = [],
  onSignOut,
  className,
}: NavbarProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const cls = ["ds-navbar", className ?? ""].filter(Boolean).join(" ");
  const initial = userName?.trim().charAt(0).toUpperCase() || "?";

  const handleItemClick = (item: UserMenuItem) => {
    setOpen(false);
    item.onClick?.();
  };

  return (
    <nav className={cls}>
      <div className="ds-navbar__brand-slot">
        {brand ?? (
          <a className="ds-navbar__brand" href="/">
            TerraShare
          </a>
        )}
      </div>

      {onModeChange && mode ? (
        <div className="ds-navbar__center">
          <div className="ds-segment" role="tablist" aria-label="Modo Busco u Ofrezco">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="tab"
                aria-selected={mode === m.value}
                className={["ds-segment__btn", mode === m.value ? "is-active" : ""]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onModeChange(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="ds-navbar__actions">
        {userName ? (
          <div className="ds-usermenu" ref={menuRef}>
            <button
              type="button"
              className="ds-usermenu__trigger"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="ds-usermenu__avatar" aria-hidden="true">
                {initial}
              </span>
              {userName}
            </button>
            {open ? (
              <div className="ds-usermenu__panel" role="menu">
                {userMenuItems.map((item) =>
                  item.href ? (
                    <a
                      key={item.label}
                      role="menuitem"
                      href={item.href}
                      className={[
                        "ds-usermenu__item",
                        item.danger ? "ds-usermenu__item--danger" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      className={[
                        "ds-usermenu__item",
                        item.danger ? "ds-usermenu__item--danger" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => handleItemClick(item)}
                    >
                      {item.label}
                    </button>
                  ),
                )}
                {onSignOut ? (
                  <>
                    {userMenuItems.length > 0 ? <div className="ds-usermenu__sep" /> : null}
                    <button
                      type="button"
                      role="menuitem"
                      className="ds-usermenu__item ds-usermenu__item--danger"
                      onClick={() => {
                        setOpen(false);
                        onSignOut();
                      }}
                    >
                      Cerrar sesión
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
