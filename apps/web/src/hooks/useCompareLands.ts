import { useCallback, useEffect, useState } from "react";

/** Clave de localStorage para la lista de comparación (HU-98 / #324). */
export const COMPARE_STORAGE_KEY = "terrashare-compare-ids";
export const COMPARE_MAX = 3;

/** Evento same-tab para sincronizar instancias del hook en la misma pestaña. */
const COMPARE_CHANGE_EVENT = "terrashare-compare-change";

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string").slice(0, COMPARE_MAX);
  } catch {
    return [];
  }
}

function writeIds(ids: string[]): void {
  window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(COMPARE_CHANGE_EVENT));
}

export interface ToggleCompareResult {
  ok: boolean;
  /** true si no se pudo añadir porque ya hay 3. */
  full?: boolean;
  ids: string[];
}

export interface UseCompareLandsResult {
  ids: string[];
  count: number;
  max: number;
  isFull: boolean;
  isCompared: (landId: string) => boolean;
  /** Añade o quita. Si la lista está llena y el id no está, no añade. */
  toggle: (landId: string) => ToggleCompareResult;
  remove: (landId: string) => void;
  clear: () => void;
}

/**
 * Lista de comparación de terrenos (HU-98). Persiste en localStorage;
 * no requiere login. Máximo 3 ids.
 */
export function useCompareLands(): UseCompareLandsResult {
  const [ids, setIds] = useState<string[]>(() => readIds());

  useEffect(() => {
    const sync = () => setIds(readIds());
    window.addEventListener("storage", sync);
    window.addEventListener(COMPARE_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(COMPARE_CHANGE_EVENT, sync);
    };
  }, []);

  const isCompared = useCallback((landId: string) => ids.includes(landId), [ids]);

  const toggle = useCallback((landId: string): ToggleCompareResult => {
    const current = readIds();
    if (current.includes(landId)) {
      const next = current.filter((id) => id !== landId);
      writeIds(next);
      setIds(next);
      return { ok: true, ids: next };
    }
    if (current.length >= COMPARE_MAX) {
      return { ok: false, full: true, ids: current };
    }
    const next = [...current, landId];
    writeIds(next);
    setIds(next);
    return { ok: true, ids: next };
  }, []);

  const remove = useCallback((landId: string) => {
    const next = readIds().filter((id) => id !== landId);
    writeIds(next);
    setIds(next);
  }, []);

  const clear = useCallback(() => {
    writeIds([]);
    setIds([]);
  }, []);

  return {
    ids,
    count: ids.length,
    max: COMPARE_MAX,
    isFull: ids.length >= COMPARE_MAX,
    isCompared,
    toggle,
    remove,
    clear,
  };
}
