import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { createApp } from "../app";
import { securityHeaders } from "./security-headers";

describe("securityHeaders middleware", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  async function requestHeaders(path: string, init?: Record<string, string>): Promise<Headers> {
    const app = createApp();
    const res = await app.request(path, { method: "GET", headers: init ?? {} });
    return res.headers;
  }

  it("setea cabeceras base en todas las respuestas", async () => {
    const h = await requestHeaders("/");
    expect(h.get("content-security-policy")).toBe(
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
    expect(h.get("x-content-type-options")).toBe("nosniff");
    expect(h.get("referrer-policy")).toBe("no-referrer");
    expect(h.get("permissions-policy")).toBe(
      "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
    );
    expect(h.get("x-frame-options")).toBe("DENY");
    expect(h.get("cross-origin-resource-policy")).toBe("same-origin");
    expect(h.get("cross-origin-opener-policy")).toBe("same-origin");
  });

  it("NO setea HSTS en dev", async () => {
    const h = await requestHeaders("/");
    expect(h.get("strict-transport-security")).toBe(null);
  });

  it("NO setea HSTS en prod sin HTTPS", async () => {
    process.env.NODE_ENV = "production";
    const h = await requestHeaders("/");
    expect(h.get("strict-transport-security")).toBe(null);
  });

  it("setea HSTS en prod con x-forwarded-proto: https", async () => {
    process.env.NODE_ENV = "production";
    const h = await requestHeaders("/", { "x-forwarded-proto": "https" });
    expect(h.get("strict-transport-security")).toBe(
      "max-age=63072000; includeSubDomains",
    );
  });

  it("setea cabeceras en respuestas de error (404)", async () => {
    const app = createApp();
    const res = await app.request("/no-existe", { method: "GET" });
    expect(res.status).toBe(404);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toBe(
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
  });

  it("setea cabeceras en respuestas de error 500 (onError)", async () => {
    const app = new Hono();
    app.use("*", securityHeaders);
    app.get("/throw", () => {
      throw new Error("test explosion");
    });
    app.onError((_err, c) => {
      return c.text("internal error", 500);
    });
    const res = await app.request("/throw", { method: "GET" });
    expect(res.status).toBe(500);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toBe(
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
  });
});
