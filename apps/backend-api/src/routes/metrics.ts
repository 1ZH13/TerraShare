import { Hono } from "hono";
import { success } from "../lib/api-response";
import { getMetrics } from "../middleware/metrics";
import { requireAuth, requireAdmin } from "../middleware/require-auth";
import type { AppEnv } from "../types";

export const metricsRoutes = new Hono<AppEnv>();

metricsRoutes.get("/metrics", requireAuth, requireAdmin, (c) => {
  return success(c, getMetrics());
});
