import { Suspense, lazy, useEffect, useState, type ComponentProps } from "react";

import type PanamaMapComponent from "./PanamaMap";

/**
 * Carga `PanamaMap` **solo en el navegador**.
 *
 * Leaflet toca `window` en cuanto se evalúa su módulo, así que importarlo desde
 * un componente que el servidor renderiza rompe el SSR con `window is not
 * defined`. En dev (`bun run dev`, donde TanStack Start sí hace SSR) eso dejaba
 * el catálogo entero en una página de error.
 *
 * `lazy()` no evalúa el módulo hasta que se renderiza, y el interruptor
 * `mounted` garantiza que ese primer render ocurra ya en el cliente: durante el
 * SSR y la hidratación inicial se pinta el hueco, y el mapa entra después.
 */
const PanamaMap = lazy(() => import("./PanamaMap"));

type PanamaMapProps = ComponentProps<typeof PanamaMapComponent>;

/**
 * Hueco con el mismo tamaño que el mapa (la columna ya estira
 * `.panama-map-container` al 100%), para no provocar salto de maqueta.
 */
function MapPlaceholder() {
  return <div className="panama-map-container" aria-hidden="true" />;
}

export default function LazyPanamaMap(props: PanamaMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <MapPlaceholder />;

  return (
    <Suspense fallback={<MapPlaceholder />}>
      <PanamaMap {...props} />
    </Suspense>
  );
}
