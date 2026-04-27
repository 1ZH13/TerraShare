import { expect, test } from "@playwright/test";

test.describe("Smoke E2E navegacion publica", () => {
  test("landing: carga correcta de hero y elementos principales", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /Encuentra el terreno perfecto/ })).toBeVisible();

    await expect(page.getByRole("link", { name: /Ver todos los terrenos/ })).toBeVisible();

    await expect(page.getByRole("button", { name: /Publicar mi terreno/ })).toBeVisible();
  });

  test("catalogo: acceso sin login y filtros basicos", async ({ page }) => {
    await page.goto("/catalog");

    await expect(page.getByRole("heading", { name: /Terrenos Disponibles/ })).toBeVisible();

    await expect(page.getByText("Finca El Tamarindo")).toBeVisible();
    await expect(page.getByText("Lote Vista Caisan")).toBeVisible();
    await expect(page.getByText("Parcela Río Indio")).toBeVisible();

    await page.getByLabel("Uso").selectOption("ganaderia");

    await expect(page.getByText("Lote Vista Caisan")).toBeVisible();
    await expect(page.getByText("Finca El Tamarindo")).toHaveCount(0);
    await expect(page.getByText("Parcela Río Indio")).toHaveCount(0);

    await page.getByLabel("Uso").selectOption("agricultura");

    await expect(page.getByText("Finca El Tamarindo")).toBeVisible();
    await expect(page.getByText("Parcela Río Indio")).toHaveCount(0);
    await expect(page.getByText("Lote Vista Caisan")).toHaveCount(0);

    await page.getByLabel("Uso").selectOption("Todos");

    await expect(page.getByText("Finca El Tamarindo")).toBeVisible();
    await expect(page.getByText("Lote Vista Caisan")).toBeVisible();
    await expect(page.getByText("Parcela Río Indio")).toBeVisible();
  });

  test("landing: navegacion hacia catalogo funciona", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /Ver todos los terrenos/ }).click();

    await expect(page).toHaveURL(/.*\/catalog/);
    await expect(page.getByRole("heading", { name: /Terrenos Disponibles/ })).toBeVisible();
  });

  test("detalle: chat local y boton de solicitud funcionan", async ({ page }) => {
    await page.goto("/lands/1");

    await expect(page.getByRole("heading", { name: "Finca El Tamarindo" })).toBeVisible();
  });
});
