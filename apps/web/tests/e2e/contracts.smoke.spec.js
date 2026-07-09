import { expect, test } from "@playwright/test";

test.describe("Smoke E2E contratos", () => {
  test("contracts: redireccion a login para invitado", async ({ page }) => {
    await page.goto("/dashboard/contracts");

    await expect(page).toHaveURL(/.*\/login/);
  });

  test("contracts: pagina de carga con formulario", async ({ page }) => {
    await page.goto("/dashboard/contracts");
    await page.waitForTimeout(2000);

    await expect(page.getByRole("heading", { name: /Entra a tu cuenta/i })).toBeVisible();
  });

  test("contracts: dashboard principal redirige a login", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/.*\/login/);
  });

  test("contracts: detalle de contrato redirige a login", async ({ page }) => {
    await page.goto("/dashboard/contracts/contract_0001");

    await expect(page).toHaveURL(/.*\/login/);
  });
});
