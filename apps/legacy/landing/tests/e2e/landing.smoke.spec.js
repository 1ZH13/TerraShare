import { expect, test } from "@playwright/test";

test("landing smoke: hero, CTA y filtro de catalogo", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Encuentra o publica terrenos productivos en minutos."
    })
  ).toBeVisible();

  await expect(page.getByRole("link", { name: "Empezar ahora" })).toHaveAttribute(
    "href",
    "http://localhost:5174/register"
  );

  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Iniciar sesion" })
  ).toHaveAttribute("href", "http://localhost:5174/login");

  await page.getByRole("button", { name: "Ganaderia" }).click();

  await expect(page.getByRole("heading", { name: "Lote Vista Caisan" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Finca El Tamarindo" })
  ).toHaveCount(0);
});
