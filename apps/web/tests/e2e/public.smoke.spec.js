import { expect, test } from "@playwright/test";

test.describe("Smoke E2E navegacion publica", () => {
  test("landing: carga correcta de hero y elementos principales", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /Terrenos productivos/ })).toBeVisible();

    await expect(page.getByRole("link", { name: /Ver catalogo/ })).toBeVisible();

    await expect(page.getByRole("button", { name: /Publicar mi terreno/ })).toBeVisible();
  });

  test("catalogo: acceso sin login y filtros basicos", async ({ page }) => {
    await page.goto("/catalog");

    await expect(page.getByRole("heading", { name: /Catalogo de Terrenos/ })).toBeVisible();

    await expect(page.getByText("Finca El Tamarindo")).toBeVisible();
    await expect(page.getByText("Lote Vista Caisan")).toBeVisible();
    await expect(page.getByText("Parcela Rio Indio")).toBeVisible();

    await page.getByRole("button", { name: "Ganaderia" }).click();

    await expect(page.getByText("Lote Vista Caisan")).toBeVisible();
    await expect(page.getByText("Finca El Tamarindo")).toHaveCount(0);
    await expect(page.getByText("Parcela Rio Indio")).toHaveCount(0);

    await page.getByRole("button", { name: "Agricultura" }).click();

    await expect(page.getByText("Finca El Tamarindo")).toBeVisible();
    await expect(page.getByText("Parcela Rio Indio")).toBeVisible();
    await expect(page.getByText("Lote Vista Caisan")).toHaveCount(0);

    await page.getByRole("button", { name: "Todos" }).click();

    await expect(page.getByText("Finca El Tamarindo")).toBeVisible();
    await expect(page.getByText("Lote Vista Caisan")).toBeVisible();
    await expect(page.getByText("Parcela Rio Indio")).toBeVisible();
  });

  test("landing: navegacion hacia catalogo funciona", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Ver catalogo" }).click();

    await expect(page).toHaveURL(/.*\/catalog/);
    await expect(page.getByRole("heading", { name: /Catalogo de Terrenos/ })).toBeVisible();
  });
});