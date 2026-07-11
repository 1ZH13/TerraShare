import { describe, expect, it } from "bun:test";

import {
  checkProductionSecurity,
  enforceProductionSecurity,
  type SecurityConfig,
} from "./security-check";

const secureProd: SecurityConfig = {
  isProduction: true,
  allowDevAuthBypass: false,
  corsAllowedOrigins: ["https://terrashare.app"],
  stripeConfigured: true,
  webhookSecretConfigured: true,
};

describe("checkProductionSecurity (#141)", () => {
  it("fuera de producción no reporta problemas fatales", () => {
    const result = checkProductionSecurity({
      ...secureProd,
      isProduction: false,
      allowDevAuthBypass: true, // en dev es normal
      corsAllowedOrigins: [],
    });
    expect(result.fatal).toEqual([]);
  });

  it("producción bien configurada: sin fatales ni advertencias", () => {
    const result = checkProductionSecurity(secureProd);
    expect(result.fatal).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("G-1: bypass de auth activo en producción es FATAL", () => {
    const result = checkProductionSecurity({ ...secureProd, allowDevAuthBypass: true });
    expect(result.fatal.length).toBe(1);
    expect(result.fatal[0]).toContain("ALLOW_DEV_AUTH_BYPASS");
  });

  it("G-1: CORS vacío en producción advierte (no fatal)", () => {
    const result = checkProductionSecurity({ ...secureProd, corsAllowedOrigins: [] });
    expect(result.fatal).toEqual([]);
    expect(result.warnings.some((w) => w.includes("CORS_ALLOWED_ORIGINS"))).toBe(true);
  });

  it("G-3: Stripe sin webhook secret advierte (no fatal)", () => {
    const result = checkProductionSecurity({ ...secureProd, webhookSecretConfigured: false });
    expect(result.fatal).toEqual([]);
    expect(result.warnings.some((w) => w.includes("STRIPE_WEBHOOK_SECRET"))).toBe(true);
  });
});

describe("enforceProductionSecurity (#141)", () => {
  it("lanza cuando hay un problema fatal", () => {
    const logs: string[] = [];
    const logger = { warn: () => {}, error: (m: string) => logs.push(m) };
    expect(() =>
      enforceProductionSecurity({ ...secureProd, allowDevAuthBypass: true }, logger),
    ).toThrow(/producción/);
    expect(logs.some((l) => l.includes("ALLOW_DEV_AUTH_BYPASS"))).toBe(true);
  });

  it("registra advertencias pero no lanza", () => {
    const warnings: string[] = [];
    const logger = { warn: (m: string) => warnings.push(m), error: () => {} };
    expect(() =>
      enforceProductionSecurity({ ...secureProd, corsAllowedOrigins: [] }, logger),
    ).not.toThrow();
    expect(warnings.length).toBe(1);
  });

  it("no lanza en una configuración de producción segura", () => {
    expect(() => enforceProductionSecurity(secureProd)).not.toThrow();
  });
});
