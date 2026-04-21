import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
});

test("arrendatario reserva y propietario aprueba", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Catalogo de terrenos" })
  ).toBeVisible();

  await page.getByRole("link", { name: "Inicia sesion para reservar" }).first().click();

  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Correo").fill("tenant@terrashare.test");
  await page.getByLabel("Contrasena").fill("123456");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/reserve\//);

  await page.getByLabel("Fecha de inicio").fill("2026-05-10");
  await page.getByLabel("Fecha de fin").fill("2026-06-10");
  await page.getByLabel("Uso propuesto").fill("prueba e2e cultivo rotativo");
  await page
    .getByLabel("Mensaje para el propietario")
    .fill("Tengo equipo y capital para iniciar de inmediato");

  await page.getByRole("button", { name: "Enviar solicitud" }).click();

  await expect(page).toHaveURL(/\/my-requests/);
  await expect(page.getByText("Pendiente del propietario").first()).toBeVisible();
  await expect(page.getByText("prueba e2e cultivo rotativo")).toBeVisible();

  await page.getByRole("button", { name: "Cerrar sesion" }).click();

  await page.getByRole("link", { name: "Iniciar sesion" }).click();
  await page.getByLabel("Correo").fill("owner@terrashare.test");
  await page.getByLabel("Contrasena").fill("123456");
  await page.getByRole("button", { name: "Entrar" }).click();

  await page.getByRole("link", { name: "Gestion propietario" }).click();

  const requestCard = page
    .locator(".request-item")
    .filter({ hasText: "prueba e2e cultivo rotativo" })
    .first();

  await expect(requestCard).toBeVisible();
  await requestCard.getByRole("button", { name: "Aprobar" }).click();

  await expect(requestCard.getByText("Aprobada")).toBeVisible();
});

test("propietario puede rechazar solicitud pendiente", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Correo").fill("owner@terrashare.test");
  await page.getByLabel("Contrasena").fill("123456");
  await page.getByRole("button", { name: "Entrar" }).click();

  await page.getByRole("link", { name: "Gestion propietario" }).click();

  const seedRequestCard = page
    .locator(".request-item")
    .filter({ hasText: "engorde de ganado en rotacion" })
    .first();

  await expect(seedRequestCard).toBeVisible();
  await seedRequestCard.getByRole("button", { name: "Rechazar" }).click();

  await expect(seedRequestCard.getByText("Rechazada")).toBeVisible();
});
