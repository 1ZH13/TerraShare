import { describe, it, expect, mock } from "bun:test";
import { Hono } from "hono";
import { errorHandler } from "./error-handler";

describe("errorHandler", () => {
  it("handles generic errors with 500 status", async () => {
    const logs: string[] = [];
    const originalError = console.error;
    console.error = mock((msg: string) => logs.push(msg));

    const app = new Hono();
    app.use("*", (c, next) => {
      c.set("requestId", "test-req-789");
      return next();
    });
    app.onError(errorHandler);
    app.get("/error", () => {
      throw new Error("Something went wrong");
    });

    const res = await app.request("/error");
    expect(res.status).toBe(500);

    console.error = originalError;
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.requestId).toBe("test-req-789");
  });

  it("handles errors with custom status code", async () => {
    const logs: string[] = [];
    const originalError = console.error;
    console.error = mock((msg: string) => logs.push(msg));

    const app = new Hono();
    app.use("*", (c, next) => {
      c.set("requestId", "test-req-custom");
      return next();
    });
    app.onError(errorHandler);
    app.get("/not-found", () => {
      const err = new Error("Not found") as any;
      err.statusCode = 404;
      err.code = "NOT_FOUND";
      throw err;
    });

    const res = await app.request("/not-found");
    expect(res.status).toBe(404);

    console.error = originalError;
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
