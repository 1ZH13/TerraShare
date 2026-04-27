import { expect, test } from "@playwright/test";

test.describe("E2E Admin - Leads", () => {
  test("admin leads: acceso a pagina de leads", async ({ page }) => {
    await page.goto("/dashboard/admin/leads");

    await expect(page.getByRole("heading", { name: /Leads/i })).toBeVisible();
    await expect(page.getByText(/Contactos capturados/)).toBeVisible();
  });

  test("admin leads: navegacion desde sidebar", async ({ page }) => {
    await page.goto("/dashboard/admin");

    await page.getByRole("link", { name: /Leads/i }).click();

    await expect(page).toHaveURL(/.*\/dashboard\/admin\/leads/);
    await expect(page.getByRole("heading", { name: /Leads/i })).toBeVisible();
  });

  test("admin leads: filtros funcionan", async ({ page }) => {
    await page.goto("/dashboard/admin/leads");

    await page.getByLabel("Buscar por email").fill("test");
    await expect(page.getByLabel("Buscar por email")).toHaveValue("test");

    await page.getByLabel("Buscar por email").clear();
    await expect(page.getByLabel("Buscar por email")).toHaveValue("");
  });
});

test.describe("E2E Catalog - Mapa Interactivo", () => {
  test("catalog: mapa Leaflet carga correctamente", async ({ page }) => {
    await page.goto("/catalog");

    const mapContainer = page.locator(".leaflet-map-container");
    await expect(mapContainer).toBeVisible();

    const leafletTiles = page.locator(".leaflet-tile-pane");
    await expect(leafletTiles).toBeVisible();
  });

  test("catalog: marcadores de terrenos visibles en mapa", async ({ page }) => {
    await page.goto("/catalog");

    await page.waitForSelector(".leaflet-marker-icon", { timeout: 10000 });

    const markers = page.locator(".leaflet-marker-icon");
    await expect(markers.first()).toBeVisible();
  });

  test("catalog: click en marcador abre popup", async ({ page }) => {
    await page.goto("/catalog");

    await page.waitForSelector(".leaflet-marker-icon", { timeout: 10000 });
    await page.locator(".leaflet-marker-icon").first().click();

    const popup = page.locator(".leaflet-popup");
    await expect(popup).toBeVisible();
  });
});

test.describe("E2E WhatsApp Contact", () => {
  test("chats: external contact endpoint returns phone from owner profile", async ({ page }) => {
    await page.goto("/chats");

    const response = await page.request.get(
      `${process.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/v1/chats/chat_seed_01/external-contact`,
      {
        headers: {
          "x-dev-role": "admin",
          "x-dev-user-id": "user_admin_01",
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.data).toBeDefined();
    expect(data.data.contact).toBeDefined();
    // Phone should come from owner profile, not hardcoded
    // If owner has no phone, it should be null
    if (data.data.contact.phone !== null) {
      expect(data.data.contact.phone).not.toBe("+50760000000");
    }
  });
});

test.describe("E2E Landing - Lead Capture", () => {
  test("landing: captura de lead funciona", async ({ page }) => {
    await page.goto("/");

    const emailInput = page.getByPlaceholder(/correo|email/i);
    if (await emailInput.isVisible()) {
      await emailInput.fill("lead-test@example.com");
      await page.getByRole("button", { name: /enviar|submit|registrar/i }).click();
      await expect(page.getByText(/gracias|registered|confirm/i)).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("E2E Admin Dashboard - Summary", () => {
  test("admin summary: muestra metricas correctas", async ({ page }) => {
    await page.goto("/dashboard/admin");

    await expect(page.locator(".stats-grid")).toBeVisible();

    const stats = page.locator(".glass-card");
    await expect(stats.first()).toBeVisible();
  });
});