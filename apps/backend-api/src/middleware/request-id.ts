import type { MiddlewareHandler } from "hono";

export const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  const traceId = c.req.header("x-trace-id") ?? crypto.randomUUID();
  c.set("requestId", requestId);
  c.set("traceId", traceId);
  c.header("x-request-id", requestId);
  c.header("x-trace-id", traceId);
  await next();
};
