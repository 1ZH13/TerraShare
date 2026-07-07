import { createRouter as createTanStackRouter, Navigate } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    // Cualquier ruta desconocida vuelve al landing (equivalente al `*` anterior).
    defaultNotFoundComponent: () => <Navigate to="/" />,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
