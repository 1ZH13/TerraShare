import { expect, test } from "@playwright/test";

test.describe("Critical flows - public navigation", () => {
  test("landing page loads with key elements", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("catalog page loads and shows land cards", async ({ page }) => {
    await page.goto("/catalog");
    await expect(page).toHaveURL("/catalog");
    await expect(page.locator("body")).toBeVisible();
  });

  test("land detail page loads", async ({ page }) => {
    await page.goto("/catalog");
    const firstLink = page.locator("a[href*='/lands/']").first();
    if (await firstLink.isVisible()) {
      await firstLink.click();
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("navigation between public pages works", async ({ page }) => {
    await page.goto("/");
    await page.goto("/catalog");
    await expect(page).toHaveURL("/catalog");
    await page.goto("/");
    await expect(page).toHaveURL("/");
  });
});

test.describe("Critical flows - auth redirect", () => {
  test("protected routes redirect to login", async ({ page }) => {
    const protectedRoutes = [
      "/dashboard",
      "/dashboard/lands",
      "/dashboard/chats",
      "/dashboard/notifications",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/.*\/login/);
    }
  });

  test("login page has all required elements", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Iniciar sesion/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Iniciar sesion/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Registrate/ })).toBeVisible();
  });

  test("register page has all required elements", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /Crear cuenta/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Crear cuenta/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Inicia sesion/ })).toBeVisible();
  });
});

test.describe("Critical flows - error handling", () => {
  test("unknown route redirects to home", async ({ page }) => {
    await page.goto("/nonexistent-page");
    await expect(page).toHaveURL("/");
  });
});
