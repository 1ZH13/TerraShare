import { expect, test } from "@playwright/test";

const okMeta = {
  requestId: "req_admin_test",
};

test("redirects to login when opening protected dashboard without token", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "Acceso administrativo" })).toBeVisible();
});

test("allows admin token and renders dashboard shell", async ({ page }) => {
  await page.route("**/api/v1/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          id: "usr_admin_1",
          clerkUserId: "clerk_admin_1",
          email: "admin@terrashare.test",
          role: "admin",
          status: "active",
          profile: {
            fullName: "Admin Terra",
          },
        },
        meta: okMeta,
      }),
    });
  });

  await page.route("**/api/v1/auth/admin/ping", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          allowed: true,
          role: "admin",
        },
        meta: okMeta,
      }),
    });
  });

  await page.route("**/api/v1/admin/lands/pending", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: [
          {
            id: "land_draft_01",
            title: "Lote de prueba",
            ownerId: "user_owner_01",
            status: "draft",
            owner: {
              id: "user_owner_01",
              email: "owner@terrashare.test",
            },
          },
        ],
        meta: okMeta,
      }),
    });
  });

  await page.route("**/api/v1/admin/users", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: [
          {
            id: "usr_user_1",
            email: "user@terrashare.test",
            role: "user",
            status: "active",
            profile: {
              fullName: "Tenant User",
            },
          },
        ],
        meta: okMeta,
      }),
    });
  });

  await page.route("**/api/v1/audit-events", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: [
          {
            id: "audit_01",
            actorId: "usr_admin_1",
            entity: "land",
            action: "approved",
            createdAt: "2026-04-21T15:14:00.000Z",
          },
        ],
        meta: okMeta,
      }),
    });
  });

  await page.goto("/login");
  await page.getByLabel("Token de sesion Clerk").fill("mock-admin-token");
  await page.getByRole("button", { name: "Validar acceso admin" }).click();

  await expect(page.getByRole("heading", { name: "Panel de operaciones admin" })).toBeVisible();
  await expect(page.getByText("admin@terrashare.test")).toBeVisible();
});

test("sends non-admin session to forbidden screen", async ({ page }) => {
  await page.route("**/api/v1/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          id: "usr_user_1",
          clerkUserId: "clerk_user_1",
          email: "user@terrashare.test",
          role: "user",
          status: "active",
          profile: {
            fullName: "Tenant User",
          },
        },
        meta: okMeta,
      }),
    });
  });

  await page.route("**/api/v1/auth/admin/ping", async (route) => {
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "Admin role required",
          requestId: "req_forbidden",
        },
      }),
    });
  });

  await page.goto("/login");
  await page.getByLabel("Token de sesion Clerk").fill("mock-user-token");
  await page.getByRole("button", { name: "Validar acceso admin" }).click();

  await expect(page.getByRole("heading", { name: "Acceso denegado" })).toBeVisible();
});
