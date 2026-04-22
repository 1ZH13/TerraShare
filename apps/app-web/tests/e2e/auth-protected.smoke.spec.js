import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
});

test("auth smoke: registro, reserva y aprobacion", async ({ page }) => {
  const email = `e2e-${Date.now()}@terrashare.test`;

  await page.goto("/register?next=%2Freserve%2Fland-1");
  await page.getByLabel("Nombre completo").fill("E2E Tenant");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contrasena").fill("123456");
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page).toHaveURL(/\/reserve\/land-1/);

  await page.getByLabel("Fecha de inicio").fill("2026-06-10");
  await page.getByLabel("Fecha de fin").fill("2026-07-10");
  await page.getByLabel("Uso propuesto").fill("prueba e2e cultivo rotativo");
  await page
    .getByLabel("Mensaje para el propietario")
    .fill("Tengo equipo y capital para iniciar de inmediato");

  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(page).toHaveURL(/\/my-requests\?created=/);
  await expect(page.getByText("Pendiente del propietario").first()).toBeVisible();

  await page.getByRole("button", { name: "Cerrar sesion" }).click();
  await page.goto("/login?next=%2Fowner%2Frequests");
  await page.getByLabel("Correo").fill("owner@terrashare.test");
  await page.getByLabel("Contrasena").fill("123456");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/owner\/requests/);

  const requestCard = page
    .locator(".request-item")
    .filter({ hasText: "prueba e2e cultivo rotativo" })
    .first();

  await expect(requestCard).toBeVisible();
  await requestCard.getByRole("button", { name: "Aprobar" }).click();
  await expect(requestCard.getByText("Aprobada")).toBeVisible();
});
