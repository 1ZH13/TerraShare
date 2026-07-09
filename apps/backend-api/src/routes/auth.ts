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
    | { fullName?: string; phone?: string; province?: string; marketPreference?: "busco" | "ofrezco" }
    | null;

  const hasAnyField =
    body &&
    (body.fullName !== undefined ||
      body.phone !== undefined ||
      body.province !== undefined ||
      body.marketPreference !== undefined);

  if (!hasAnyField) {
    return failure(
      c,
      400,
      "VALIDATION_ERROR",
      "Provide fullName, phone, province and/or marketPreference",
    );
  }

  if (body.marketPreference !== undefined && !["busco", "ofrezco"].includes(body.marketPreference)) {
    return failure(c, 400, "VALIDATION_ERROR", "marketPreference must be 'busco' or 'ofrezco'");
  }

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
