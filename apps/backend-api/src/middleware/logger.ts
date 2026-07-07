import type { MiddlewareHandler } from "hono";

interface LogEntry {
  level: "info" | "warn" | "error";
  timestamp: string;
  requestId: string;
  traceId: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  userId?: string;
}

export const loggerMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const requestId = c.get("requestId") ?? "unknown";
  const traceId = c.get("traceId") ?? "unknown";
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;
  const authUser = c.get("authUser");

  const entry: LogEntry = {
    level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
    timestamp: new Date().toISOString(),
    requestId,
    traceId,
    method,
    path,
    status,
    duration,
  };

  if (authUser?.id) {
    entry.userId = authUser.id;
  }

  console.log(JSON.stringify(entry));
};
