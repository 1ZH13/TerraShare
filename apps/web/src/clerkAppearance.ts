import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/clerk-react";
import type { ThemeChoice } from "./lib/theme";

// El tipo `Appearance` no se expone como paquete resoluble aquí; lo derivamos
// de la prop `appearance` de ClerkProvider para mantener el chequeo estricto.
type Appearance = NonNullable<ComponentProps<typeof ClerkProvider>["appearance"]>;

/**
 * Tema editorial para los componentes de Clerk (SignIn / SignUp / modales).
 * Los valores replican los tokens `--ts-*` de src/styles/tokens.css; se
 * mantienen como literales porque `appearance` de Clerk no lee variables CSS
 * en tiempo de construcción. Si cambian los tokens, actualizar aquí también.
 */
const lightAppearance: Appearance = {
  variables: {
    colorPrimary: "#2f5138", // --ts-green
    colorText: "#24312a", // --ts-text
    colorTextSecondary: "#55654f", // --ts-text-secondary
    colorBackground: "#fffdf8", // --ts-surface
    colorInputBackground: "#fffdf8", // --ts-surface
    colorInputText: "#24312a", // --ts-text
    colorDanger: "#b8623f", // --ts-clay
    borderRadius: "12px", // --ts-radius
    fontFamily: '"Hanken Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  elements: {
    card: {
      backgroundColor: "#fffdf8",
      border: "1px solid #e6ddc9", // --ts-border
      boxShadow: "0 6px 24px rgba(36, 49, 42, 0.08)",
    },
    headerTitle: {
      fontFamily: '"Spectral", Georgia, serif',
      fontWeight: 500,
      letterSpacing: "-0.02em",
    },
    formButtonPrimary: {
      backgroundColor: "#2f5138",
      fontWeight: 600,
      textTransform: "none",
      "&:hover": { backgroundColor: "#24312a" }, // --ts-green-ink
      "&:focus": { boxShadow: "0 0 0 3px rgba(47, 81, 56, 0.28)" }, // --ts-ring
    },
    footerActionLink: {
      color: "#2f5138",
      "&:hover": { color: "#24312a" },
    },
  },
};

/** Variante oscura (#278): replica los tokens `--ts-*` del tema oscuro para que
   el widget de Clerk acompañe al resto de la app. */
const darkAppearance: Appearance = {
  variables: {
    colorPrimary: "#4f8a61", // --ts-green (oscuro)
    colorText: "#ece4d3", // --ts-text (oscuro)
    colorTextSecondary: "#b7c1b3", // --ts-text-secondary (oscuro)
    colorBackground: "#1e2621", // --ts-surface (oscuro)
    colorInputBackground: "#19201b", // --ts-surface-alt (oscuro)
    colorInputText: "#ece4d3", // --ts-text (oscuro)
    colorDanger: "#d07a54", // --ts-clay (oscuro)
    borderRadius: "12px",
    fontFamily: '"Hanken Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  elements: {
    card: {
      backgroundColor: "#1e2621",
      border: "1px solid #33403a", // --ts-border (oscuro)
      boxShadow: "0 8px 28px rgba(0, 0, 0, 0.5)",
    },
    headerTitle: {
      fontFamily: '"Spectral", Georgia, serif',
      fontWeight: 500,
      letterSpacing: "-0.02em",
    },
    formButtonPrimary: {
      backgroundColor: "#4f8a61",
      color: "#0f140f",
      fontWeight: 600,
      textTransform: "none",
      "&:hover": { backgroundColor: "#5f9c71" },
      "&:focus": { boxShadow: "0 0 0 3px rgba(122, 170, 138, 0.42)" },
    },
    footerActionLink: {
      color: "#8aa891", // --ts-green-soft (oscuro): legible sobre superficie oscura
      "&:hover": { color: "#ece4d3" },
    },
  },
};

/** Apariencia de Clerk según el tema activo. */
export function getClerkAppearance(theme: ThemeChoice): Appearance {
  return theme === "dark" ? darkAppearance : lightAppearance;
}

/** Compatibilidad: apariencia clara por defecto. */
export const clerkAppearance = lightAppearance;
