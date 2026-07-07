import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { ClerkProvider } from "@clerk/clerk-react";
import { esES } from "@clerk/localizations";
import { clerkAppearance } from "../clerkAppearance";
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

function RootComponent() {
  return <Outlet />;
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        <ClerkProvider
          publishableKey={PUBLISHABLE_KEY}
          appearance={clerkAppearance}
          localization={esES}
          signUpForceRedirectUrl="/onboarding"
          signInFallbackRedirectUrl="/dashboard"
        >
          {children}
        </ClerkProvider>
        <Scripts />
      </body>
    </html>
  );
}
