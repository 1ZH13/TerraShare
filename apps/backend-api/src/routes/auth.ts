import { Hono } from "hono";
import { UpdateProfileSchema } from "@terrashare/shared";

import { success } from "../lib/api-response";
import { validateBody } from "../lib/validate";
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

  const parsed = await validateBody(c, UpdateProfileSchema);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;

  const store = getStore();
  const existing = store.users.get(authUser.id) ?? authUser;
  const nextProfile = {
    ...existing.profile,
    ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
    ...(body.phone !== undefined ? { phone: body.phone } : {}),
    ...(body.province !== undefined ? { province: body.province } : {}),
    ...(body.marketPreference !== undefined ? { marketPreference: body.marketPreference } : {}),
  };

  // Update the in-memory store (the source require-auth reads from).
  const updatedUser = { ...existing, profile: nextProfile };
  store.users.set(authUser.id, updatedUser);

  // Persist to Mongo. Upsert so el onboarding funciona aunque el usuario aún no
  // exista en Mongo; $setOnInsert cubre los campos requeridos del schema (#137).
  await User.updateOne(
    { clerkUserId: authUser.id },
    {
      $set: { profile: nextProfile },
      $setOnInsert: {
        clerkUserId: authUser.id,
        email: authUser.email,
        role: authUser.role,
        status: authUser.status,
      },
    },
    { upsert: true },
  );

  return success(c, updatedUser);
});

authRoutes.get("/auth/admin/ping", requireAuth, requireAdmin, (c) => {
  return success(c, {
    allowed: true,
    role: "admin",
  });
});
