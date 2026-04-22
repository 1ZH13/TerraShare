import { Hono } from "hono";

import { success } from "../lib/api-response";
import { requireAdmin, requireAuth } from "../middleware/require-auth";
import type { AppEnv } from "../types";

export const authRoutes = new Hono<AppEnv>();

authRoutes.get("/auth/me", requireAuth, (c) => {
  const authUser = c.get("authUser");
  return success(c, authUser);
});

authRoutes.get("/auth/admin/ping", requireAuth, requireAdmin, (c) => {
  return success(c, {
    allowed: true,
    role: "admin",
  });
});
