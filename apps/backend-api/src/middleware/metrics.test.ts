import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { metricsMiddleware, getMetrics } from "./metrics";

describe("metricsMiddleware", () => {
  it("tracks request count and latency", async () => {
    const app = new Hono();
    app.use("*", metricsMiddleware);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(200);

    const m = getMetrics();
    expect(m.totalRequests).toBeGreaterThan(0);
    expect(m.averageLatency).toBeGreaterThanOrEqual(0);
    expect(m.requestsByPath["/test"]).toBeGreaterThan(0);
  });
});
