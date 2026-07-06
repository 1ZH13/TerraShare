import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { corsAllowHeaders, env, resolveCorsOrigin } from "./env";

describe("env CORS helpers", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCors = process.env.CORS_ALLOWED_ORIGINS;
  const originalDevBypass = process.env.ALLOW_DEV_AUTH_BYPASS;

  beforeEach(() => {
    delete process.env.CORS_ALLOWED_ORIGINS;
    delete process.env.ALLOW_DEV_AUTH_BYPASS;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.CORS_ALLOWED_ORIGINS = originalCors;
    process.env.ALLOW_DEV_AUTH_BYPASS = originalDevBypass;
  });

  describe("resolveCorsOrigin", () => {
    it("dev: permite localhost en cualquier puerto sin CORS_ALLOWED_ORIGINS", () => {
      process.env.NODE_ENV = "development";
      expect(resolveCorsOrigin("http://localhost:5173")).toBe("http://localhost:5173");
      expect(resolveCorsOrigin("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
    });

    it("dev: permite origen explicito en la allowlist", () => {
      process.env.NODE_ENV = "development";
      process.env.CORS_ALLOWED_ORIGINS = "http://localhost:5173";
      expect(resolveCorsOrigin("http://localhost:5173")).toBe("http://localhost:5173");
    });

    it("dev: deniega origen no localhost y no listado", () => {
      process.env.NODE_ENV = "development";
      expect(resolveCorsOrigin("https://evil.com")).toBe(null);
    });

    it("prod: permite solo origenes en CORS_ALLOWED_ORIGINS", () => {
      process.env.NODE_ENV = "production";
      process.env.CORS_ALLOWED_ORIGINS = "https://terrashare.app,https://www.terrashare.app";
      expect(resolveCorsOrigin("https://terrashare.app")).toBe("https://terrashare.app");
      expect(resolveCorsOrigin("https://www.terrashare.app")).toBe("https://www.terrashare.app");
      expect(resolveCorsOrigin("http://localhost:5173")).toBe(null);
    });

    it("prod: fail-closed cuando CORS_ALLOWED_ORIGINS esta vacio", () => {
      process.env.NODE_ENV = "production";
      delete process.env.CORS_ALLOWED_ORIGINS;
      expect(resolveCorsOrigin("https://terrashare.app")).toBe(null);
      expect(resolveCorsOrigin("http://localhost:5173")).toBe(null);
    });

    it("retorna null para string vacio (sin header Origin)", () => {
      process.env.NODE_ENV = "development";
      expect(resolveCorsOrigin("")).toBe(null);
    });
  });

  describe("corsAllowHeaders", () => {
    it("dev: incluye headers dev cuando ALLOW_DEV_AUTH_BYPASS=true", () => {
      process.env.NODE_ENV = "development";
      process.env.ALLOW_DEV_AUTH_BYPASS = "true";
      const headers = corsAllowHeaders();
      expect(headers).toContain("Content-Type");
      expect(headers).toContain("Authorization");
      expect(headers).toContain("x-request-id");
      expect(headers).toContain("stripe-signature");
      expect(headers).toContain("x-dev-role");
      expect(headers).toContain("x-dev-user-id");
    });

    it("prod: NO incluye headers dev", () => {
      process.env.NODE_ENV = "production";
      process.env.ALLOW_DEV_AUTH_BYPASS = "false";
      const headers = corsAllowHeaders();
      expect(headers).toContain("Content-Type");
      expect(headers).toContain("Authorization");
      expect(headers).toContain("x-request-id");
      expect(headers).toContain("stripe-signature");
      expect(headers).not.toContain("x-dev-role");
      expect(headers).not.toContain("x-dev-user-id");
    });
  });

  describe("env.isProduction", () => {
    it("true cuando NODE_ENV=production", () => {
      process.env.NODE_ENV = "production";
      expect(env.isProduction).toBe(true);
    });

    it("false cuando NODE_ENV=development", () => {
      process.env.NODE_ENV = "development";
      expect(env.isProduction).toBe(false);
    });
  });
});
