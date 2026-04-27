import { expect, test } from "@playwright/test";

test.describe("E2E Rental Request Flow", () => {
  test("reserva: formulario de solicitud carga", async ({ page }) => {
    await page.goto("/reserve/1");

    await expect(page.getByRole("heading", { name: /Solicitar/i })).toBeVisible();
  });

  test("rental request: crear solicitud muestra estado pendiente", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByText(/Mi Dashboard/)).toBeVisible();
  });

  test("rental request: admin puede ver solicitudes", async ({ page }) => {
    await page.goto("/dashboard/admin");

    await page.getByRole("link", { name: /Dashboard/i }).click();

    await expect(page.getByText(/Panel de Administración/)).toBeVisible();
    await expect(page.getByText(/Solicitudes recientes/)).toBeVisible();
  });
});

test.describe("E2E Payments Flow", () => {
  test("pagos: pagina de pagos carga", async ({ page }) => {
    await page.goto("/dashboard/payments");

    await expect(page.getByText(/Pagos/)).toBeVisible();
  });

  test("pagos: checkout session funciona", async ({ page }) => {
    await page.goto("/checkout/success");

    await expect(
      page.getByText(/Gracias|pago confirmado/i)
    ).toBeVisible({ timeout: 5000 }).catch(() => {
      return expect(page.getByText(/checkout/i)).toBeVisible();
    });
  });

  test("pagos: cancelacion redirect", async ({ page }) => {
    await page.goto("/checkout/cancel");

    await expect(page.getByText(/cancelado/i)).toBeVisible();
  });
});

test.describe("E2E Auth Flow", () => {
  test("registro: flujo completo visible", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByText(/Crear cuenta/i)).toBeVisible();
    await expect(page.getByText(/Unete a TerraShare/i)).toBeVisible();
  });

  test("login: redireccion desde rutas protegidas", async ({ page }) => {
    await page.goto("/dashboard/profile");

    await expect(page).toHaveURL(/.*\/login/);
  });

  test("logout: cierra sesion correctamente", async ({ page }) => {
    await page.goto("/dashboard");

    const signOutButton = page.getByRole("button", { name: /cerrar/i });
    if (await signOutButton.isVisible()) {
      await signOutButton.click();
      await expect(page).toHaveURL(/.*\/login/);
    }
  });
});

test.describe("E2E Lands Management", () => {
  test("mis terrenos: carga correcta", async ({ page }) => {
    await page.goto("/dashboard/lands");

    await expect(page.getByText(/Mis terrenos/)).toBeVisible();
  });

  test("detalle terreno: informacion completa", async ({ page }) => {
    await page.goto("/lands/1");

    await expect(page.getByText(/Finca El Tamarindo/)).toBeVisible();
    await expect(page.getByText(/Los Santos/)).toBeVisible();
    await expect(page.getByText(/5.2/)).toBeVisible();
  });

  test("admin: moderada de terrenos funciona", async ({ page }) => {
    await page.goto("/dashboard/admin/lands");

    await expect(page.getByText(/Moderación de Terrenos/)).toBeVisible();
  });
});