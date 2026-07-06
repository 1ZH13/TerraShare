import { Hono } from "hono";
import { success, failure } from "../lib/api-response";
import { requireAuth } from "../middleware/require-auth";
import { User } from "../db/schemas";
import type { AppEnv } from "../types";

export const privacyRoutes = new Hono<AppEnv>();

privacyRoutes.get("/me/data-export", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const user = await User.findOne({ clerkUserId: authUser.clerkUserId }).lean();
  if (!user) {
    return failure(c, 404, "NOT_FOUND", "User not found");
  }
  return success(c, {
    user: { email: user.email, profile: user.profile, role: user.role },
    exportedAt: new Date().toISOString(),
    note: "Datos personales exportados segun politica de privacidad",
  });
});

privacyRoutes.delete("/me", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const user = await User.findOne({ clerkUserId: authUser.clerkUserId });
  if (!user) {
    return failure(c, 404, "NOT_FOUND", "User not found");
  }
  user.deletedAt = new Date();
  user.email = `deleted_${user.id}@anonymized.local`;
  user.profile.fullName = "Usuario Eliminado";
  user.profile.phone = undefined;
  await user.save();
  return success(c, { deleted: true, message: "Cuenta eliminada. Los datos seran retenidos 30 dias." });
});
