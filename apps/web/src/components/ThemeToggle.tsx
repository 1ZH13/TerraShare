import { Moon, Sun } from "lucide-react";
import { setTheme, type ThemeChoice } from "../lib/theme";
import { useTheme } from "../hooks/useTheme";

/** Botón accesible para alternar tema claro/oscuro (#278).
   Arranca con la preferencia efectiva (guardada o del sistema) y persiste la
   elección explícita del usuario en localStorage. */
export default function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const isDark = theme === "dark";

  const toggle = () => {
    const next: ThemeChoice = isDark ? "light" : "dark";
    setTheme(next); // emite THEME_EVENT → useTheme actualiza el estado
  };

  const label = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <button
      type="button"
      onClick={toggle}
      className={className ? `ts-theme-toggle ${className}` : "ts-theme-toggle"}
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun size={18} strokeWidth={1.9} aria-hidden="true" /> : <Moon size={18} strokeWidth={1.9} aria-hidden="true" />}
    </button>
  );
}
