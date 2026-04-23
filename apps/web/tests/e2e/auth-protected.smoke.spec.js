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

  test("login: navegacion desde landing funciona", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /Iniciar sesion/i }).click();

    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByRole("heading", { name: /Iniciar sesion/i })).toBeVisible();
  });

  test("register: navegacion desde landing funciona", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /Registrate/i }).first().click();

    await expect(page).toHaveURL(/.*\/register/);
    await expect(page.getByRole("heading", { name: /Crear cuenta/i })).toBeVisible();
  });

  test("reserve: redireccion a login para invitado", async ({ page }) => {
    await page.goto("/reserve/1");

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

  test("reserve: desde detail page boton dirige a login", async ({ page }) => {
    await page.goto("/catalog");
    await page.getByText("Finca El Tamarindo").click();

    await expect(page.getByRole("link", { name: /Iniciar sesion/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Crear cuenta/i })).toBeVisible();
  });
});