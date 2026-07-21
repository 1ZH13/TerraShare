import { test, expect } from "@playwright/test";

import {
  expectClientSideBackNavigation,
  expectClientSideNavigation,
  expectThemeChoicePersists,
  expectThemeToggleResponds,
  waitForClient,
} from "./support/interactivity.js";

/**
 * Interactividad y salud del SSR en el servidor de desarrollo (#360).
 *
 * Corre en el proyecto `dev-ssr`, contra `bun run dev` (puerto 5174), donde
 * TanStack Start renderiza el documento completo en el servidor. Es un modo de
 * arranque distinto al de producción y hasta ahora no lo probaba nadie, que es
 * justo por donde se colaron dos fallos graves:
 *
 * - **#354**: el cliente montaba sobre un `#root` que en SSR no existe, así que
 *   la app nunca hidrataba. El HTML se veía perfecto —y por eso los smoke tests
 *   pasaban— pero nada era clicable y era imposible iniciar sesión.
 * - **#358**: `CatalogPage` importaba Leaflet, que toca `window` al evaluarse,
 *   y tumbaba el render del servidor. En producción (SPA client-only) el módulo
 *   nunca se evalúa en el servidor, así que allí no se notaba.
 *
 * Aquí, si la hidratación no engancha, el marcado se ve igual pero nada
 * responde: exactamente el escenario que hay que detectar.
 */
test.describe("interactividad del cliente — servidor de desarrollo con SSR (#360)", () => {
  test("el botón de tema responde al clic y cambia data-theme", async ({ page }) => {
    await page.goto("/");
    await waitForClient(page);
    await expectThemeToggleResponds(page);
  });

  test("la elección de tema se guarda en localStorage", async ({ page }) => {
    await page.goto("/");
    await waitForClient(page);
    await expectThemeChoicePersists(page);
  });

  test("el clic en «Explorar catálogo» navega por el router, sin recargar el documento", async ({ page }) => {
    await page.goto("/");
    await waitForClient(page);
    await expectClientSideNavigation(page);
  });

  test("volver atrás lo maneja el router y deja la landing utilizable", async ({ page }) => {
    await page.goto("/");
    await waitForClient(page);
    await expectClientSideBackNavigation(page);
  });
});

test.describe("render del servidor sin errores (#360)", () => {
  // Rutas que el servidor debe poder renderizar. `/catalog` está aquí porque un
  // import que toca `window` en el módulo (Leaflet) la tumbaba entera.
  for (const path of ["/", "/catalog", "/login", "/register"]) {
    test(`${path} se renderiza en el servidor sin reventar`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response, `sin respuesta para ${path}`).not.toBeNull();
      expect(response.status(), `${path} respondió ${response.status()}`).toBeLessThan(400);

      // Una excepción en el render del servidor deja la página sin nada útil:
      // se comprueba que llegó documento con contenido real.
      const body = await page.locator("body").innerText();
      expect(body.length, `${path} llegó vacía: probablemente falló el render del servidor`).toBeGreaterThan(0);
      expect(body).not.toContain("window is not defined");
    });
  }
});
