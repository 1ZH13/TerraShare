import { expect, test } from "@playwright/test";

test.describe("Critical flows - public navigation", () => {
  test("landing page loads with key elements", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("catalog page requires auth and redirects to login", async ({ page }) => {
    await page.goto("/catalog");
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("land detail page loads", async ({ page }) => {
    await page.goto("/lands/land_0001");
    await page.waitForTimeout(2000);
    await expect(page.locator("body")).toBeVisible();
  });

  test("navigation between public pages works", async ({ page }) => {
    await page.goto("/");
    await page.goto("/catalog");
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/.*\/login/);
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
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/.*\/login/);
    }
  });

  test("login page has all required elements", async ({ page }) => {
    await page.goto("/login");
    await page.waitForTimeout(2000);
    await expect(page.getByRole("heading", { name: /Entra a tu cuenta/i })).toBeVisible();
    await expect(page.locator("[data-clerk-id], .clerk-sign-in, #clerk-sign-in")).toBeVisible();
    await expect(page.getByRole("link", { name: /Registrate/i })).toBeVisible();
  });

  test("register page has all required elements", async ({ page }) => {
    await page.goto("/register");
    await page.waitForTimeout(2000);
    await expect(page.getByRole("heading", { name: /Crea tu cuenta/i })).toBeVisible();
    await expect(page.locator("[data-clerk-id], .clerk-sign-up, #clerk-sign-up")).toBeVisible();
    await expect(page.getByRole("link", { name: /Inicia sesion/i })).toBeVisible();
  });
});

test.describe("Critical flows - error handling", () => {
  test("unknown route redirects to home", async ({ page }) => {
    await page.goto("/nonexistent-page");
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL("/");
  });
});
