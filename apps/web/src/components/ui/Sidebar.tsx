import type { ReactNode } from "react";

export interface SidebarLink {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  active?: boolean;
  separator?: false;
}

/** Un ítem del sidebar: un enlace/acción o un separador. */
export type SidebarItem = SidebarLink | { separator: true };

export interface SidebarProps {
  /** Marca superior; por defecto un enlace "TerraShare · Admin". */
  brand?: ReactNode;
  items: SidebarItem[];
  footer?: ReactNode;
  className?: string;
}

export default function Sidebar({ brand, items, footer, className }: SidebarProps) {
  const cls = ["ds-sidebar", className ?? ""].filter(Boolean).join(" ");

  return (
    <aside className={cls}>
      {brand ?? (
        <a className="ds-sidebar__brand" href="/dashboard/admin">
          TerraShare · Admin
        </a>
      )}

      <nav>
        {items.map((item, i) => {
          if (item.separator) {
            return <div key={`sep-${i}`} className="ds-sidebar__sep" />;
          }

          const itemCls = ["ds-sidebar__item", item.active ? "is-active" : ""]
            .filter(Boolean)
            .join(" ");
          const content = (
            <>
              {item.icon ? (
                <span className="ds-sidebar__icon" aria-hidden="true">
                  {item.icon}
                </span>
              ) : null}
              {item.label}
            </>
          );

          return item.href ? (
            <a
              key={item.label}
              href={item.href}
              className={itemCls}
              aria-current={item.active ? "page" : undefined}
            >
              {content}
            </a>
          ) : (
            <button key={item.label} type="button" className={itemCls} onClick={item.onClick}>
              {content}
            </button>
          );
        })}
      </nav>

      {footer ? (
        <>
          <div className="ds-sidebar__spacer" />
          {footer}
        </>
      ) : null}
    </aside>
  );
}
