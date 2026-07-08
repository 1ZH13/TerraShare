import { Hono } from "hono";
import { success } from "../lib/api-response";
import { requireAuth, requireAdmin } from "../middleware/require-auth";
import { AuditEvent } from "../db/schemas";
import type { AppEnv } from "../types";

export const auditRoutes = new Hono<AppEnv>();

auditRoutes.use("/*", requireAuth, requireAdmin);

auditRoutes.get("/audit-events", async (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "50");
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    AuditEvent.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditEvent.countDocuments(),
  ]);

  return success(c, items);
});
