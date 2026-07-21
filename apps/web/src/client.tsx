import { StrictMode, startTransition } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { StartClient } from "@tanstack/react-start/client";
import { getRouter } from "./router";

// La app arranca en dos modos distintos y el montaje NO es el mismo en ambos:
//
// - Producción: se despliega como SPA client-only. `scripts/serve-static.mjs`
//   (y el Dockerfile) generan un `index.html` con `<div id="root">`, así que se
//   monta ahí con `createRoot`. Es también lo que prueban los E2E.
//
// - Desarrollo (`bun run dev`): TanStack Start hace SSR y `__root.tsx` emite el
//   documento completo (<html>…<body>). Ahí NO existe `#root`, y montar sobre
//   él dejaba `createRoot(null)` → "Target container is not a DOM element". La
//   app nunca hidrataba: el HTML se veía, pero nada del cliente corría (ni
//   Clerk ni los manejadores de eventos), así que era imposible iniciar sesión.
//   Para ese caso se hidrata el documento con `StartClient`, que reconstruye el
//   router con los datos de hidratación del servidor.
startTransition(() => {
  const container = document.getElementById("root");

  if (container) {
    createRoot(container).render(
      <StrictMode>
        <RouterProvider router={getRouter()} />
      </StrictMode>,
    );
    return;
  }

  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});
