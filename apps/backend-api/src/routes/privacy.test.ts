import { describe, it, expect } from "bun:test";
import { createApp } from "../app";

const app = createApp();

describe("Privacy endpoints", () => {
  it("GET /api/v1/me/data-export requires auth", async () => {
    const res = await app.request("/api/v1/me/data-export");
    expect([401, 403]).toContain(res.status);
  });

  it("DELETE /api/v1/me requires auth", async () => {
    const res = await app.request("/api/v1/me", { method: "DELETE" });
    expect([401, 403]).toContain(res.status);
  });
});
