import { expect, test } from "@playwright/test";

test.describe("Smoke E2E auth y flujo protegido", () => {
  test("login: carga correcta y elementos visibles", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /Entra a tu cuenta/i })).toBeVisible();
    await expect(page.getByText(/continuar en TerraShare/i)).toBeVisible();
  });

  test("register: carga correcta y elementos visibles", async ({ page }) => {
    await page.goto("/register");

    await expect(page.locator("h1.ts-title")).toBeVisible();
    await expect(page.getByText(/publicar o solicitar tierra/i)).toBeVisible();
  });

  test("reserve: redireccion a login para invitado", async ({ page }) => {
    await page.goto("/reserve/land_0001");

    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByRole("heading", { name: /Entra a tu cuenta/i })).toBeVisible();
  });

  test("dashboard: redireccion a login para invitado", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/.*\/login/);
  });

  test("admin: redireccion a login para invitado", async ({ page }) => {
    await page.goto("/dashboard/admin");

    await expect(page).toHaveURL(/.*\/login/);
  });
});
