import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";

// Entrada del cliente de TanStack Start.
//
// El servidor emite el documento completo desde `__root.tsx` (<html>…<body>), así
// que la hidratación va sobre `document`: no existe ningún contenedor `#root`.
// Antes se montaba con `createRoot(document.getElementById("root"))`, que era
// `null`, y la app NUNCA hidrataba — sin hidratación no corre nada del cliente
// (ni Clerk ni los manejadores de eventos), aunque el HTML del servidor se viera.
//
// `StartClient` reconstruye el router con los datos de hidratación que envía el
// servidor; crear uno aparte con `getRouter()` se saltaba ese protocolo.
startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});
