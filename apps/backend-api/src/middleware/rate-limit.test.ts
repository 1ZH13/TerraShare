import { describe, expect, it, beforeEach } from "bun:test";

import { Hono } from "hono";
import { rateLimitByIP, rateLimitByUser, rateLimitByApiKey, resetRateLimitStore } from "./rate-limit";

beforeEach(() => {
  resetRateLimitStore();
});

describe("rateLimitByIP", () => {
  it("incluye Retry-After en respuesta 429", async () => {
    const app = new Hono();
    app.use("/test", rateLimitByIP(0));
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(res.headers.get("X-RateLimit-Limit")).toBe("0");
  });
});

describe("rateLimitByUser", () => {
  it("incluye Retry-After en respuesta 429 para usuario autenticado", async () => {
    const app = new Hono<{ Variables: { authUser: { id: string } } }>();
    app.use("/test", async (c, next) => {
      c.set("authUser", { id: "user_test" });
      await next();
    });
    app.use("/test", rateLimitByUser(0));
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("permite paso si no hay authUser (no aplica)", async () => {
    const app = new Hono<{ Variables: { authUser?: { id: string } } }>();
    app.use("/test", rateLimitByUser(0));
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });
});

describe("rateLimitByApiKey", () => {
  it("rate limit por api key contador separado", async () => {
    const app = new Hono();
    app.use("/test", rateLimitByApiKey("test-tool", 0));
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test", {
      headers: { "x-api-key": "key_one" },
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("claves diferentes tienen contadores independientes", async () => {
    const app = new Hono();
    app.use("/test", rateLimitByApiKey("test-tool", 1));
    app.get("/test", (c) => c.json({ ok: true }));

    const r1 = await app.request("/test", {
      headers: { "x-api-key": "key_one" },
    });
    expect(r1.status).toBe(200);

    const r2 = await app.request("/test", {
      headers: { "x-api-key": "key_one" },
    });
    expect(r2.status).toBe(429);

    const r3 = await app.request("/test", {
      headers: { "x-api-key": "key_two" },
    });
    expect(r3.status).toBe(200);
  });
});
