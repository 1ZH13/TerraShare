import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
});

test("landing smoke: hero, CTA y filtro de catalogo", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Terrenos productivos, alquiler sin complicaciones.",
    })
  ).toBeVisible();

  await expect(page.getByRole("link", { name: "Empezar ahora" })).toHaveAttribute(
    "href",
    "/register"
  );

  await page.getByRole("link", { name: "Ver catalogo" }).click();
  await expect(page).toHaveURL(/\/catalog/);
  await expect(page.getByRole("heading", { name: "Catalogo de terrenos" })).toBeVisible();

  await page.getByRole("combobox", { name: "Tipo de terreno" }).selectOption("Ganaderia");

  await expect(page.getByRole("heading", { name: "Lote Vista Caisan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Finca El Tamarindo" })).toHaveCount(0);
});
