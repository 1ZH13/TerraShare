import { expect, test } from "@playwright/test";

test.describe("Smoke E2E auth y flujo protegido", () => {
  test("login: carga correcta y elementos visibles", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /Iniciar sesion/i })).toBeVisible();
    await expect(page.getByText(/Accede a tu cuenta TerraShare/)).toBeVisible();

    await expect(page.getByRole("button", { name: /Continuar con Google/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continuar con Microsoft/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continuar con email/ })).toBeVisible();

    await expect(page.getByRole("link", { name: /Registrate/ })).toBeVisible();
  });

  test("register: carga correcta y elementos visibles", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByRole("heading", { name: /Crear cuenta/i })).toBeVisible();
    await expect(page.getByText(/Unete a TerraShare/)).toBeVisible();

    await expect(page.getByRole("button", { name: /Continuar con Google/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continuar con Microsoft/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continuar con email/ })).toBeVisible();

    await expect(page.getByRole("link", { name: /Inicia sesion/ })).toBeVisible();
  });

  test("reserve: redireccion a login para invitado", async ({ page }) => {
    await page.goto("/reserve/land_0001");

    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByRole("heading", { name: /Iniciar sesion/i })).toBeVisible();
  });

  test("dashboard: redireccion a login para invitado", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByRole("heading", { name: /Iniciar sesion/i })).toBeVisible();
  });

  test("admin: redireccion a login para invitado", async ({ page }) => {
    await page.goto("/dashboard/admin");

    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByRole("heading", { name: /Iniciar sesion/i })).toBeVisible();
  });
});