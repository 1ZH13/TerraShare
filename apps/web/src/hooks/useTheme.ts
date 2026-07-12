import { useEffect, useState } from "react";
import { getInitialTheme, THEME_EVENT, type ThemeChoice } from "../lib/theme";

/** Tema actual reactivo (#278). Arranca en "light" en SSR y se sincroniza en el
   cliente con la preferencia efectiva; se actualiza cuando `setTheme` emite el
   evento de cambio. */
export function useTheme(): ThemeChoice {
  const [theme, setThemeState] = useState<ThemeChoice>("light");

  useEffect(() => {
    setThemeState(getInitialTheme());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ThemeChoice>).detail;
      if (detail === "light" || detail === "dark") setThemeState(detail);
    };
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  return theme;
}
