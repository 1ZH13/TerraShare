import { describe, it, expect, mock } from "bun:test";
import { Hono } from "hono";
import { loggerMiddleware } from "./logger";

describe("loggerMiddleware", () => {
  it("logs request with correct fields", async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = mock((msg: string) => logs.push(msg));

    const app = new Hono();
    app.use("*", (c, next) => {
      c.set("requestId", "test-req-123");
      return next();
    });
    app.use("*", loggerMiddleware);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(200);

    console.log = originalLog;
    expect(logs.length).toBe(1);
    const entry = JSON.parse(logs[0]);
    expect(entry.requestId).toBe("test-req-123");
    expect(entry.method).toBe("GET");
    expect(entry.path).toBe("/test");
    expect(entry.status).toBe(200);
    expect(entry.duration).toBeGreaterThanOrEqual(0);
    expect(entry.timestamp).toBeDefined();
    expect(entry.level).toBe("info");
  });

  it("sets warn level for 4xx errors", async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = mock((msg: string) => logs.push(msg));

    const app = new Hono();
    app.use("*", (c, next) => {
      c.set("requestId", "test-req-456");
      return next();
    });
    app.use("*", loggerMiddleware);
    app.get("/not-found", (c) => c.json({ error: "not found" }, 404));

    const res = await app.request("/not-found");
    expect(res.status).toBe(404);

    console.log = originalLog;
    const entry = JSON.parse(logs[0]);
    expect(entry.level).toBe("warn");
  });
});
