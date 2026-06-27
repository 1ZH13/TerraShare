import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { requireAdmin, requireAuth } from "../middleware/require-auth";
import { getStore } from "../store/in-memory-db";
import { User } from "../db/schemas";
import type { AppEnv } from "../types";

export const authRoutes = new Hono<AppEnv>();

authRoutes.get("/auth/me", requireAuth, (c) => {
  const authUser = c.get("authUser");
  return success(c, authUser);
});

authRoutes.patch("/auth/profile", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const body = (await c.req.json().catch(() => null)) as
    | { fullName?: string; phone?: string }
    | null;

  if (!body || (body.fullName === undefined && body.phone === undefined)) {
    return failure(c, 400, "VALIDATION_ERROR", "Provide fullName and/or phone");
  }

  const store = getStore();
  const existing = store.users.get(authUser.id) ?? authUser;
  const nextProfile = {
    ...existing.profile,
    ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
    ...(body.phone !== undefined ? { phone: body.phone } : {}),
  };

  // Update the in-memory store (the source require-auth reads from).
  const updatedUser = { ...existing, profile: nextProfile };
  store.users.set(authUser.id, updatedUser);

  // Persist to Mongo if the user exists there (no-op for dev-bypass users).
  await User.updateOne({ clerkUserId: authUser.id }, { profile: nextProfile });

  return success(c, updatedUser);
});

authRoutes.get("/auth/admin/ping", requireAuth, requireAdmin, (c) => {
  return success(c, {
    allowed: true,
    role: "admin",
  });
});
