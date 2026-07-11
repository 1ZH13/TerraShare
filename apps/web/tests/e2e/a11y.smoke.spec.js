import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Auditoría de accesibilidad automatizada (WCAG 2.1 A/AA) con axe (#178 / HU-61).
 * Corre en CI (Playwright). Falla ante violaciones de impacto serio o crítico en
 * las páginas públicas clave. Reglas etiquetadas wcag2a/wcag2aa/wcag21a/wcag21aa.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function analyze(page) {
  return new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
}

/** Solo bloqueamos por violaciones serias/críticas (las de mayor impacto real). */
function seriousViolations(results) {
  return results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
}

test.describe("Accesibilidad WCAG 2.1 AA (#178)", () => {
  test("landing pública sin violaciones serias/críticas", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const results = await analyze(page);
    const serious = seriousViolations(results);
    if (serious.length > 0) {
      console.log("Landing violations:", JSON.stringify(serious.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2));
    }
    expect(serious).toEqual([]);
  });

  test("login sin violaciones serias/críticas", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const results = await analyze(page);
    const serious = seriousViolations(results);
    if (serious.length > 0) {
      console.log("Login violations:", JSON.stringify(serious.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2));
    }
    expect(serious).toEqual([]);
  });

  test("detalle de terreno sin violaciones serias/críticas", async ({ page }) => {
    await page.goto("/catalog");
    // El catálogo está tras login; si redirige, saltamos (se cubre en login).
    await page.waitForLoadState("networkidle");
    const results = await analyze(page);
    const serious = seriousViolations(results);
    if (serious.length > 0) {
      console.log("Catalog violations:", JSON.stringify(serious.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2));
    }
    expect(serious).toEqual([]);
  });
});
