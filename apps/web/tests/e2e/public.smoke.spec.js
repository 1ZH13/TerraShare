import { expect, test } from "@playwright/test";

test.describe("Smoke E2E navegacion publica", () => {
  test("landing: carga correcta de hero y CTA principal", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /Tierra fértil/ })).toBeVisible();

    await expect(page.getByRole("link", { name: /Explorar catálogo/ })).toBeVisible();
  });

  test("landing: el CTA de catalogo lleva a registro para invitados", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /Explorar catálogo/ }).click();

    await expect(page).toHaveURL(/.*\/register/);
  });

  test("catalogo: ruta protegida redirige a login para invitados", async ({ page }) => {
    await page.goto("/catalog");

    await expect(page).toHaveURL(/.*\/login/);
  });

  test("detalle: el detalle de terreno es publico (sin redireccion a login)", async ({ page }) => {
    await page.goto("/lands/land_0001");

    await expect(page).toHaveURL(/.*\/lands\/land_0001/);
    await expect(page).not.toHaveURL(/.*\/login/);
  });
});
