import { Hono } from "hono";

import { success } from "../lib/api-response";
import { isDatabaseConnected } from "../config/database";
import { env } from "../config/env";
import type { AppEnv } from "../types";

export const healthRoutes = new Hono<AppEnv>();

healthRoutes.get("/health", (c) => {
  return success(c, {
    status: "ok",
    service: "backend-api",
    version: "v1",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

healthRoutes.get("/health/live", (c) => {
  return success(c, { status: "ok" });
});

healthRoutes.get("/health/ready", (c) => {
  const dbOk = isDatabaseConnected();
  const stripeStatus = env.stripeConfigured ? "ok" : "not_configured";
  const status = dbOk ? "ok" : "degraded";

  return success(c, {
    status,
    checks: {
      database: dbOk ? "ok" : "fail",
      stripe: stripeStatus,
    },
    timestamp: new Date().toISOString(),
  });
});
