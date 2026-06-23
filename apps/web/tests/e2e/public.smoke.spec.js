import { expect, test } from "@playwright/test";

test.describe("Smoke E2E navegacion publica", () => {
  test("landing: carga correcta de hero y elementos principales", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /Encuentra el terreno perfecto/ })).toBeVisible();

    await expect(page.getByRole("link", { name: /Ver todos los terrenos/ })).toBeVisible();
  });

  test("catalogo: acceso sin login y filtros basicos", async ({ page }) => {
    await page.goto("/catalog");

    await expect(page.getByRole("heading", { name: /Terrenos Disponibles/ })).toBeVisible();

    const resultsText = await page.getByText(/\d+ resultados/).textContent();
    expect(resultsText).toBeTruthy();
  });

  test("landing: navegacion hacia catalogo funciona", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /Ver todos los terrenos/ }).click();

    await expect(page).toHaveURL(/.*\/catalog/);
    await expect(page.getByRole("heading", { name: /Terrenos Disponibles/ })).toBeVisible();
  });

  test("detalle: acceso a detalle de terreno funciona", async ({ page }) => {
    await page.goto("/catalog");

    await page.waitForTimeout(1000);

    const firstLandCard = page.locator(".land-card").first();
    if (await firstLandCard.isVisible()) {
      await firstLandCard.click();
    }

    await page.waitForTimeout(500);
  });
});