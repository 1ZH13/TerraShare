import { describe, it, expect } from "bun:test";
import { createApp } from "../app";

const app = createApp();

describe("Health endpoints", () => {
  it("GET /api/v1/health returns ok with version and uptime", async () => {
    const res = await app.request("/api/v1/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.service).toBe("backend-api");
    expect(body.data.version).toBe("v1");
    expect(body.data.uptime).toBeGreaterThanOrEqual(0);
    expect(body.data.timestamp).toBeDefined();
  });

  it("GET /api/v1/health/live returns ok", async () => {
    const res = await app.request("/api/v1/health/live");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("ok");
  });

  it("GET /api/v1/health/ready returns status with checks", async () => {
    const res = await app.request("/api/v1/health/ready");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.checks).toBeDefined();
    expect(body.data.checks.database).toMatch(/^(ok|fail)$/);
    expect(body.data.checks.stripe).toMatch(/^(ok|not_configured)$/);
    expect(body.data.status).toMatch(/^(ok|degraded)$/);
    expect(body.data.timestamp).toBeDefined();
  });
});
