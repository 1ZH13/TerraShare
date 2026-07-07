import type { ComponentType } from "react";
import { Link } from "@tanstack/react-router";
import "./empty-state.css";

interface EmptyStateProps {
  /** Icono lucide-react (p.ej. ClipboardList). */
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  description?: string;
  /** Acción principal: enlace interno o botón. */
  action?: { label: string; to?: string; onClick?: () => void };
  /** Variante compacta para columnas laterales. */
  compact?: boolean;
  /** Variante de error (icono/acento en terracota). */
  tone?: "default" | "error";
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  tone = "default",
}: EmptyStateProps) {
  return (
    <div className={`es ${compact ? "es--compact" : ""} ${tone === "error" ? "es--error" : ""}`}>
      <span className="es__icon" aria-hidden="true">
        <Icon size={compact ? 24 : 28} strokeWidth={1.7} />
      </span>
      <div className="es__title">{title}</div>
      {description && <p className="es__desc">{description}</p>}
      {action &&
        (action.to ? (
          <Link to={action.to} className="es__cta">
            {action.label}
          </Link>
        ) : (
          <button type="button" className="es__cta" onClick={action.onClick}>
            {action.label}
          </button>
        ))}
    </div>
  );
}
