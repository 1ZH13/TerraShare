/* Control del tema claro/oscuro (#278).
   El atributo `data-theme` en <html> decide el tema (ver src/styles/tokens.css).
   La preferencia explícita se guarda en localStorage; si no hay ninguna se
   respeta la del sistema operativo. El script anti-flash en __root.tsx aplica
   esta misma lógica antes del primer pintado. */

export type ThemeChoice = "light" | "dark";

export const THEME_STORAGE_KEY = "ts-theme";

/** Evento en `window` que emite el nuevo tema cuando el usuario lo cambia.
   Permite que superficies que no leen CSS (p. ej. el widget de Clerk) reaccionen
   en vivo al toggle. */
export const THEME_EVENT = "ts-themechange";

export function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/** Preferencia efectiva: la guardada, o la del sistema si no hay elección. */
export function getInitialTheme(): ThemeChoice {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  }
  return systemPrefersDark() ? "dark" : "light";
}

export function applyTheme(theme: ThemeChoice): void {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function setTheme(theme: ThemeChoice): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
  applyTheme(theme);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<ThemeChoice>(THEME_EVENT, { detail: theme }));
  }
}
