import { useCallback, useEffect, useState } from "react";

import { addFavorite, getMyFavorites, removeFavorite } from "../services/api";

interface UseFavoritesOptions {
  /**
   * Cuando es `false` no se consulta el backend (p. ej. en páginas públicas si
   * el usuario no ha iniciado sesión). El set queda vacío y `ready` en true.
   */
  enabled?: boolean;
}

export interface UseFavoritesResult {
  /** Ids de los terrenos guardados por el usuario. */
  ids: Set<string>;
  /** true una vez resuelta la carga inicial (con éxito o error). */
  ready: boolean;
  isFavorite: (landId: string) => boolean;
  /** Alterna el estado guardado con actualización optimista; revierte si falla. */
  toggle: (landId: string) => Promise<void>;
}

/**
 * Estado de favoritos/"Guardados" (#147). Carga el set de ids una vez y expone
 * un toggle optimista. Cada página que lo use mantiene su propia instancia; no
 * hay estado global compartido, lo que simplifica su uso en páginas públicas
 * (detalle) y autenticadas (home, catálogo) por igual.
 */
export function useFavorites({ enabled = true }: UseFavoritesOptions = {}): UseFavoritesResult {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIds(new Set());
      setReady(true);
      return;
    }
    let active = true;
    setReady(false);
    getMyFavorites()
      .then((lands) => {
        if (!active) return;
        setIds(new Set(lands.map((l) => l.id)));
        setReady(true);
      })
      .catch(() => {
        // Sin sesión válida o error transitorio: dejamos el set vacío pero listo.
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  const isFavorite = useCallback((landId: string) => ids.has(landId), [ids]);

  const toggle = useCallback(async (landId: string) => {
    const wasFavorite = ids.has(landId);
    // Optimista: reflejamos el cambio de inmediato.
    setIds((prev) => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(landId);
      else next.add(landId);
      return next;
    });
    try {
      if (wasFavorite) await removeFavorite(landId);
      else await addFavorite(landId);
    } catch (err) {
      // Revertir ante fallo.
      setIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.add(landId);
        else next.delete(landId);
        return next;
      });
      throw err;
    }
  }, [ids]);

  return { ids, ready, isFavorite, toggle };
}
