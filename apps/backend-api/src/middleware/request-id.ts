import type { MiddlewareHandler } from "hono";

export const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  c.set("requestId", requestId);
  c.header("x-request-id", requestId);
  await next();
};
