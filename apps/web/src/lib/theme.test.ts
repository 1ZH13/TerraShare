import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { DEFAULT_THEME, THEME_STORAGE_KEY, getInitialTheme } from "./theme";

/**
 * El tema por defecto es el claro y NO depende del sistema operativo (#373).
 * Antes se caía a `prefers-color-scheme`, así que cualquiera con Windows en
 * oscuro abría TerraShare en oscuro sin haberlo pedido nunca.
 *
 * `matchMedia` se falsea diciendo siempre «el SO prefiere oscuro»: si el tema
 * vuelve a consultarlo, estas pruebas lo cazan.
 */
describe("getInitialTheme", () => {
  const store = new Map<string, string>();
  let originalMatchMedia: unknown;

  beforeEach(() => {
    store.clear();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage;

    originalMatchMedia = (globalThis as { matchMedia?: unknown }).matchMedia;
    (globalThis as { matchMedia?: unknown }).matchMedia = () => ({ matches: true });
  });

  afterEach(() => {
    (globalThis as { matchMedia?: unknown }).matchMedia = originalMatchMedia;
  });

  it("usa el tema claro cuando no hay preferencia guardada, aunque el SO esté en oscuro", () => {
    expect(getInitialTheme()).toBe("light");
    expect(DEFAULT_THEME).toBe("light");
  });

  it("respeta la elección guardada del usuario", () => {
    store.set(THEME_STORAGE_KEY, "dark");
    expect(getInitialTheme()).toBe("dark");

    store.set(THEME_STORAGE_KEY, "light");
    expect(getInitialTheme()).toBe("light");
  });

  it("ignora valores corruptos en localStorage y cae al claro", () => {
    store.set(THEME_STORAGE_KEY, "system");
    expect(getInitialTheme()).toBe("light");
  });
});
