import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { createApp } from "../app";

describe("CORS por entorno", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCors = process.env.CORS_ALLOWED_ORIGINS;
  const originalDevBypass = process.env.ALLOW_DEV_AUTH_BYPASS;

  beforeEach(() => {
    process.env.NODE_ENV = "development";
    process.env.ALLOW_DEV_AUTH_BYPASS = "true";
    delete process.env.CORS_ALLOWED_ORIGINS;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.CORS_ALLOWED_ORIGINS = originalCors;
    process.env.ALLOW_DEV_AUTH_BYPASS = originalDevBypass;
  });

  async function preflight(origin: string, extra?: Record<string, string>) {
    const app = createApp();
    const res = await app.request("/api/v1/health", {
      method: "OPTIONS",
      headers: {
        origin,
        "access-control-request-method": "GET",
        "access-control-request-headers": "content-type",
        ...extra,
      },
    });
    return res;
  }

  it("dev: preflight con localhost permitido refleja origin y devuelve 204", async () => {
    const res = await preflight("http://localhost:5173");
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(res.headers.get("access-control-allow-methods")).toBeTruthy();
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("dev: allowHeaders incluye x-dev-user-id cuando ALLOW_DEV_AUTH_BYPASS=true", async () => {
    const res = await preflight("http://localhost:5173", {
      "access-control-request-headers": "x-dev-user-id",
    });
    const allowHeaders = res.headers.get("access-control-allow-headers") ?? "";
    expect(allowHeaders).toContain("x-dev-user-id");
  });

  it("dev: deniega origen no localhost y no listado (sin ACAO)", async () => {
    const res = await preflight("https://evil.com");
    expect(res.headers.get("access-control-allow-origin")).toBe(null);
  });

  it("prod: permite origen en CORS_ALLOWED_ORIGINS", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_DEV_AUTH_BYPASS = "false";
    process.env.CORS_ALLOWED_ORIGINS = "https://terrashare.app";
    const res = await preflight("https://terrashare.app");
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://terrashare.app");
  });

  it("prod: deniega localhost cuando no esta en allowlist", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_DEV_AUTH_BYPASS = "false";
    process.env.CORS_ALLOWED_ORIGINS = "https://terrashare.app";
    const res = await preflight("http://localhost:5173");
    expect(res.headers.get("access-control-allow-origin")).toBe(null);
  });

  it("prod: NO incluye x-dev-user-id en allowHeaders", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_DEV_AUTH_BYPASS = "false";
    process.env.CORS_ALLOWED_ORIGINS = "https://terrashare.app";
    const res = await preflight("https://terrashare.app", {
      "access-control-request-headers": "x-dev-user-id,content-type",
    });
    const allowHeaders = res.headers.get("access-control-allow-headers") ?? "";
    expect(allowHeaders).not.toContain("x-dev-user-id");
  });

  it("prod: fail-closed cuando CORS_ALLOWED_ORIGINS esta vacio", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_DEV_AUTH_BYPASS = "false";
    delete process.env.CORS_ALLOWED_ORIGINS;
    const res = await preflight("https://terrashare.app");
    expect(res.headers.get("access-control-allow-origin")).toBe(null);
  });

  it("exposeHeaders incluye x-request-id y cabeceras de rate limit", async () => {
    const res = await preflight("http://localhost:5173");
    const expose = res.headers.get("access-control-expose-headers") ?? "";
    expect(expose).toContain("x-request-id");
    expect(expose).toContain("X-RateLimit-Limit");
    expect(expose).toContain("X-RateLimit-Remaining");
    expect(expose).toContain("X-RateLimit-Reset");
  });
});
