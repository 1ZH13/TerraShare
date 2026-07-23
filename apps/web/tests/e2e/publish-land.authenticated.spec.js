import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

/**
 * Pruebas del asistente de publicación **con sesión iniciada**.
 *
 * Hasta ahora la suite solo llegaba a la redirección a /login, así que todo lo
 * que hay detrás del inicio de sesión era un punto ciego: por ahí se colaron
 * #387 (publicar dejaba el terreno en borrador) y #390 (un título de una letra
 * reventaba cuatro pasos después).
 *
 * La sesión se abre con un *sign-in ticket* que `clerk.signIn` pide a la API de
 * Clerk con la clave secreta. No hay ninguna contraseña de por medio, ni en el
 * repositorio ni en el entorno, y no depende de qué estrategias tenga activas
 * la instancia.
 */

// `||` y no `??`: en CI la variable llega definida pero vacía cuando el secreto
// no existe, y una cadena vacía no es nullish — con `??` se colaría como correo.
const TEST_EMAIL =
  process.env.E2E_CLERK_TEST_EMAIL?.trim() || "vero.buyer+clerk_test@example.com";

test.describe("Publicar terreno (con sesión)", () => {
  // Sin token no se puede entrar: se salta en vez de fallar, para que la suite
  // siga verde donde las claves de Clerk no estén configuradas.
  test.skip(
    !process.env.CLERK_TESTING_TOKEN,
    "Clerk sin configurar (falta CLERK_SECRET_KEY)",
  );

  test.beforeEach(async ({ page }) => {
    // `clerk.signIn` exige estar en una página no protegida que ya cargó Clerk.
    await page.goto("/");
    await clerk.signIn({ page, emailAddress: TEST_EMAIL });
  });

  test("el asistente carga y no rebota a /login", async ({ page }) => {
    await page.goto("/dashboard/lands/new");

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText("1 · Datos del terreno")).toBeVisible();
  });

  test("el campo de título avisa del mínimo antes de escribir nada (#390)", async ({ page }) => {
    await page.goto("/dashboard/lands/new");

    await expect(page.getByText(/Mínimo 3 caracteres/i)).toBeVisible();
  });

  test("un título de una letra se rechaza en el paso 1, no en el de fotos (#390)", async ({
    page,
  }) => {
    await page.goto("/dashboard/lands/new");

    await page.getByPlaceholder("Ej. Finca El Tamarindo").fill("s");
    await page.getByRole("button", { name: /Continuar/i }).click();

    await expect(page.getByText(/al menos 3 caracteres/i)).toBeVisible();
    // Y sigue en el paso 1. Antes llegabas hasta el 4 y el rechazo del servidor
    // aparecía allí, con lo que parecía un fallo de las fotos.
    await expect(page.getByText("1 · Datos del terreno")).toBeVisible();
  });

  test("con un título válido sí avanza al paso 2", async ({ page }) => {
    await page.goto("/dashboard/lands/new");

    await page.getByPlaceholder("Ej. Finca El Tamarindo").fill("Finca de prueba E2E");
    await page.getByPlaceholder("0.0").fill("2");
    await page.getByRole("button", { name: /^Ganadería$/ }).click();
    await page.getByRole("button", { name: /Continuar/i }).click();

    await expect(page.getByText("2 · Ubicación")).toBeVisible();
  });

  test("la provincia es un desplegable con las 10 provincias y las comarcas (#391)", async ({
    page,
  }) => {
    await page.goto("/dashboard/lands/new");
    await page.getByPlaceholder("Ej. Finca El Tamarindo").fill("Finca de prueba E2E");
    await page.getByPlaceholder("0.0").fill("2");
    await page.getByRole("button", { name: /^Ganadería$/ }).click();
    await page.getByRole("button", { name: /Continuar/i }).click();

    // Era un <input> de texto libre: por ahí entraron provincias como «fffff».
    const province = page.locator("select").first();
    await expect(province).toBeVisible();

    const options = await province.locator("option").allTextContents();
    expect(options).toContain("Panamá Oeste"); // faltaba en la lista vieja
    expect(options).toContain("Guna Yala"); // las comarcas tampoco estaban
    expect(options).toContain("Chiriquí");
    // 10 provincias + 4 comarcas + el marcador de posición.
    expect(options).toHaveLength(15);
  });
});
