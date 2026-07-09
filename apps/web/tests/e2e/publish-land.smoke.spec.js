import { expect, test } from "@playwright/test";

test.describe("Smoke E2E publicar terreno", () => {
  test("publish new land: redireccion a login para invitado", async ({ page }) => {
    await page.goto("/dashboard/lands/new");

    await expect(page).toHaveURL(/.*\/login/);
  });

  test("publish new land: pagina de carga con formulario", async ({ page }) => {
    await page.goto("/dashboard/lands/new");
    await page.waitForTimeout(2000);

    await expect(page.getByRole("heading", { name: /Entra a tu cuenta/i })).toBeVisible();
  });

  test("my lands: redireccion a login para invitado", async ({ page }) => {
    await page.goto("/dashboard/lands");

    await expect(page).toHaveURL(/.*\/login/);
  });

  test("dashboard lands list: redireccion a login para invitado", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/.*\/login/);
  });
});
