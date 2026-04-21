import { Hono } from "hono";

import { success } from "../lib/api-response";
import type { AppEnv } from "../types";

export const healthRoutes = new Hono<AppEnv>();

healthRoutes.get("/health", (c) => {
  return success(c, {
    status: "ok",
    service: "backend-api",
    timestamp: new Date().toISOString(),
  });
});
