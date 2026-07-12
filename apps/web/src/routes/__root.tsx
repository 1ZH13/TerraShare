import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { ClerkProvider } from "@clerk/clerk-react";
import { esES } from "@clerk/localizations";
import { getClerkAppearance } from "../clerkAppearance";
import { useTheme } from "../hooks/useTheme";
import ErrorBoundary from "../components/ErrorBoundary";
import "../i18n";
import "../styles.css";
import "../styles/tokens.css";
import "../styles/base.css";
import "../components/ui/ui.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "TerraShare - Alquiler de Terrenos Productivos en Panama" },
      {
        name: "description",
        content:
          "TerraShare conecta propietarios y arrendatarios de terrenos productivos en Panama. Explora fincas, pastizales y mas sin registro.",
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
});

/** ClerkProvider cuya apariencia sigue el tema activo (#278). */
function ThemedClerkProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      appearance={getClerkAppearance(theme)}
      localization={esES}
      signUpForceRedirectUrl="/onboarding"
      signInFallbackRedirectUrl="/dashboard"
    >
      {children}
    </ClerkProvider>
  );
}

function RootComponent() {
  // El límite vive dentro del shell (#261): así un error de página se contiene
  // aquí y nunca alcanza a <html>/<head>, que es lo que borraba el CSS.
  return (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    // data-theme="light" por defecto en SSR; el script anti-flash lo corrige al
    // tema real antes del primer pintado. suppressHydrationWarning silencia el
    // (esperado) desajuste de valor entre servidor y cliente.
    <html lang="es" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Anti-flash de tema (#278): fija data-theme antes del primer pintado,
            replicando la lógica de lib/theme.ts (preferencia guardada o del SO). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var k='ts-theme',v=localStorage.getItem(k);var t=(v==='light'||v==='dark')?v:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();",
          }}
        />
        <HeadContent />
      </head>
      <body>
        <ThemedClerkProvider>{children}</ThemedClerkProvider>
        <Scripts />
      </body>
    </html>
  );
}
