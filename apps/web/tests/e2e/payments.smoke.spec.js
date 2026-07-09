import { expect, test } from "@playwright/test";

test.describe("Smoke E2E pagos", () => {
  test("payments list: redireccion a login para invitado", async ({ page }) => {
    await page.goto("/dashboard/payments");

    await expect(page).toHaveURL(/.*\/login/);
  });

  test("payments list: pagina de carga con formulario", async ({ page }) => {
    await page.goto("/dashboard/payments");
    await page.waitForTimeout(2000);

    await expect(page.getByRole("heading", { name: /Entra a tu cuenta/i })).toBeVisible();
  });

  test("payment page: redireccion a login para invitado", async ({ page }) => {
    await page.goto("/pay/request_0001");

    await expect(page).toHaveURL(/.*\/login/);
  });

  test("checkout success: pagina es publica", async ({ page }) => {
    await page.goto("/checkout/success");

    await expect(page).toHaveURL(/.*\/checkout\/success/);
    await expect(page).not.toHaveURL(/.*\/login/);
  });

  test("checkout cancel: pagina es publica", async ({ page }) => {
    await page.goto("/checkout/cancel");

    await expect(page).toHaveURL(/.*\/checkout\/cancel/);
    await expect(page).not.toHaveURL(/.*\/login/);
  });
});
