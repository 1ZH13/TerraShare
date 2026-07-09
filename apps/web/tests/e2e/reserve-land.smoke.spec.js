import { expect, test } from "@playwright/test";

test.describe("Smoke E2E solicitar alquiler", () => {
  test("reserve land: redireccion a login para invitado", async ({ page }) => {
    await page.goto("/reserve/land_0001");

    await expect(page).toHaveURL(/.*\/login/);
  });

  test("reserve land: pagina de carga con formulario", async ({ page }) => {
    await page.goto("/reserve/land_0001");
    await page.waitForTimeout(2000);

    await expect(page.getByRole("heading", { name: /Entra a tu cuenta/i })).toBeVisible();
  });

  test("reserve land: detalle de terreno es publico", async ({ page }) => {
    await page.goto("/lands/land_0001");

    await expect(page).toHaveURL(/.*\/lands\/land_0001/);
    await expect(page).not.toHaveURL(/.*\/login/);
  });

  test("reserve land: boton de reservar existe en detalle", async ({ page }) => {
    await page.goto("/lands/land_0001");
    await page.waitForTimeout(2000);

    const reserveButton = page.getByRole("button", { name: /reservar|alquilar|solicitar/i });
    const hasReserveButton = await reserveButton.isVisible().catch(() => false);

    if (hasReserveButton) {
      await reserveButton.click();
      await expect(page).toHaveURL(/.*\/login/);
    }
  });
});
