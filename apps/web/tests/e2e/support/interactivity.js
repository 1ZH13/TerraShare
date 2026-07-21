import { expect } from "@playwright/test";

/**
 * Comprobaciones de interactividad reutilizables (#360).
 *
 * Se comparten entre los dos modos de arranque de la app —el build estático de
 * producción y el servidor de desarrollo con SSR— porque el fallo que interesa
 * cazar (el cliente de React no engancha) se manifiesta igual en ambos, pero
 * solo uno de los dos lo estaba probando.
 */

/**
 * Marca el objeto `window` actual. Sobrevive a la navegación del router de
 * React (que no recarga el documento) y desaparece en una recarga completa; así
 * distinguimos una navegación del cliente de un enlace HTML normal.
 */
const MARK = "__terrashareHydrationProbe";

/**
 * Margen para que el cliente arranque. En producción el bundle está construido
 * y engancha casi al instante; con el servidor de desarrollo, Vite transforma y
 * sirve los módulos bajo demanda, así que la primera hidratación puede pasar de
 * los 5 s por defecto de `expect`. El margen holgado evita un test intermitente
 * sin debilitar la comprobación: si el cliente está muerto, no responde nunca.
 */
const HYDRATION_TIMEOUT = 20000;

/**
 * Espera a que la app quede lista para interactuar. Sin esto, en dev se podría
 * hacer clic antes de que React enganche y el fallo parecería una regresión.
 */
export async function waitForClient(page) {
  await page.waitForLoadState("networkidle");
}

export async function markWindow(page) {
  await page.evaluate((key) => {
    window[key] = true;
  }, MARK);
}

export async function windowStillMarked(page) {
  return page.evaluate((key) => window[key] === true, MARK);
}

const themeToggle = (page) =>
  page.getByRole("button", { name: /Cambiar a modo (claro|oscuro)/ });

const readTheme = (page) =>
  page.evaluate(() => document.documentElement.getAttribute("data-theme"));

/**
 * El botón de tema responde al clic. El atributo `data-theme` lo escribe un
 * manejador de React: sin hidratación no cambia nunca, por muy visible que esté
 * el botón en el HTML.
 */
export async function expectThemeToggleResponds(page) {
  const toggle = themeToggle(page);
  await expect(toggle).toBeVisible();

  const before = await readTheme(page);
  await toggle.click();

  await expect
    .poll(() => readTheme(page), {
      message: "data-theme no cambió: el cliente de React no responde a los clics",
      timeout: HYDRATION_TIMEOUT,
    })
    .not.toBe(before);

  expect(["light", "dark"]).toContain(await readTheme(page));
}

/** Persistir la elección es trabajo del cliente; el servidor no toca localStorage. */
export async function expectThemeChoicePersists(page) {
  await themeToggle(page).click();

  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("ts-theme")), {
      message: "no se guardó la preferencia de tema",
      timeout: HYDRATION_TIMEOUT,
    })
    .toMatch(/^(light|dark)$/);
}

/**
 * Un clic en el CTA principal navega **por el router**, sin recargar el
 * documento. La marca en `window` es la prueba: si el navegador hubiera seguido
 * el href a pelo —que es lo que pasa cuando no hay hidratación— se perdería.
 */
export async function expectClientSideNavigation(page) {
  await markWindow(page);

  await page.getByRole("link", { name: /Explorar catálogo/ }).first().click();

  // El catálogo está tras login: sin sesión, la landing manda a registro.
  await expect.poll(() => new URL(page.url()).pathname, { timeout: HYDRATION_TIMEOUT }).not.toBe("/");
  expect(new URL(page.url()).pathname).toMatch(/^\/(catalog|login|register)/);

  expect(
    await windowStillMarked(page),
    "el documento se recargó: la navegación no la resolvió el router del cliente",
  ).toBe(true);
}

/** El retroceso también lo maneja el router, y la landing sigue viva después. */
export async function expectClientSideBackNavigation(page) {
  await page.getByRole("link", { name: /Explorar catálogo/ }).first().click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: HYDRATION_TIMEOUT }).not.toBe("/");

  await markWindow(page);
  await page.goBack();

  await expect.poll(() => new URL(page.url()).pathname, { timeout: HYDRATION_TIMEOUT }).toBe("/");
  expect(
    await windowStillMarked(page),
    "el retroceso recargó el documento en vez de resolverlo el router",
  ).toBe(true);

  await expectThemeToggleResponds(page);
}
