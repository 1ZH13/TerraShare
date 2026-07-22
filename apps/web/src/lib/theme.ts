/* Control del tema claro/oscuro (#278).
   El atributo `data-theme` en <html> decide el tema (ver src/styles/tokens.css).
   La preferencia explícita se guarda en localStorage; si no hay ninguna se usa
   el tema CLARO, que es el predeterminado de la marca. El script anti-flash en
   __root.tsx aplica esta misma lógica antes del primer pintado.

   Deliberadamente NO se consulta `prefers-color-scheme` (#373): hacerlo abría
   la web en oscuro a cualquiera con el SO en oscuro, que no es el aspecto por
   defecto de TerraShare. Quien prefiera el oscuro lo elige en el conmutador y
   la elección se recuerda. */

export type ThemeChoice = "light" | "dark";

/** Tema con el que arranca quien nunca ha tocado el conmutador. */
export const DEFAULT_THEME: ThemeChoice = "light";

export const THEME_STORAGE_KEY = "ts-theme";

/** Evento en `window` que emite el nuevo tema cuando el usuario lo cambia.
   Permite que superficies que no leen CSS (p. ej. el widget de Clerk) reaccionen
   en vivo al toggle. */
export const THEME_EVENT = "ts-themechange";

/** Preferencia efectiva: la guardada, o el tema por defecto si no hay elección. */
export function getInitialTheme(): ThemeChoice {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  }
  return DEFAULT_THEME;
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
