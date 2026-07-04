import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { esES } from "@clerk/localizations";
import App from "./App";
import { clerkAppearance } from "./clerkAppearance";
import "./styles.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./components/ui/ui.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      appearance={clerkAppearance}
      localization={esES}
      // Todo registro (embed o modal) pasa por el onboarding; inicio de sesión
      // cae al dashboard salvo que exista un `from` previo.
      signUpForceRedirectUrl="/onboarding"
      signInFallbackRedirectUrl="/dashboard"
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);