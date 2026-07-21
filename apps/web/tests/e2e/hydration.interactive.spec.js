import { test } from "@playwright/test";

import {
  expectClientSideBackNavigation,
  expectClientSideNavigation,
  expectThemeChoicePersists,
  expectThemeToggleResponds,
} from "./support/interactivity.js";

/**
 * Interactividad real del cliente sobre el build de producción (#360).
 *
 * El resto de la suite comprueba HTML ya renderizado: texto, enlaces,
 * redirecciones. Estas pruebas exigen que el JavaScript del cliente esté vivo:
 * cada una necesita que un manejador de React responda a un clic. Si la app no
 * hidrata, fallan.
 *
 * El mismo juego corre contra el servidor de desarrollo en `hydration.ssr.spec.js`.
 */
test.describe("interactividad del cliente — build de producción (#360)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("el botón de tema responde al clic y cambia data-theme", async ({ page }) => {
    await expectThemeToggleResponds(page);
  });

  test("la elección de tema se guarda en localStorage", async ({ page }) => {
    await expectThemeChoicePersists(page);
  });

  test("el clic en «Explorar catálogo» navega por el router, sin recargar el documento", async ({ page }) => {
    await expectClientSideNavigation(page);
  });

  test("volver atrás lo maneja el router y deja la landing utilizable", async ({ page }) => {
    await expectClientSideBackNavigation(page);
  });
});
