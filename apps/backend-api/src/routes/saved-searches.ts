import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../middleware/require-auth";
import { SavedSearch } from "../db/schemas";
import { success, failure } from "../lib/api-response";
import { createSavedSearchSchema } from "@terrashare/shared";
import type { AppEnv } from "../types";

export const savedSearchRoutes = new Hono<AppEnv>();

savedSearchRoutes.use("/users/me/saved-searches/*", requireAuth);

savedSearchRoutes.get("/users/me/saved-searches", async (c) => {
  const user = c.get("authUser");
  if (!user) return failure(c, 401, "UNAUTHORIZED", "Not authenticated");

  const searches = await SavedSearch.find({ userId: user.id }).sort({ createdAt: -1 }).lean();
  return success(c, searches, 200);
});

savedSearchRoutes.post("/users/me/saved-searches", async (c) => {
  const user = c.get("authUser");
  if (!user) return failure(c, 401, "UNAUTHORIZED", "Not authenticated");

  let rawBody;
  try {
    rawBody = await c.req.json();
  } catch {
    return failure(c, 400, "VALIDATION_ERROR", "Invalid JSON");
  }

  const parsed = createSavedSearchSchema.safeParse(rawBody);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    return failure(c, 400, "VALIDATION_ERROR", "Invalid input", details);
  }

  const { name, filters } = parsed.data;

  // Check limits (e.g. max 10 saved searches)
  const count = await SavedSearch.countDocuments({ userId: user.id });
  if (count >= 10) {
    return failure(c, 422, "BUSINESS_RULE_VIOLATION", "Maximum 10 saved searches allowed");
  }

  const id = randomUUID();
  const newSearch = await SavedSearch.create({
    id,
    userId: user.id,
    name,
    filters,
  });

  return success(c, newSearch.toObject(), 201);
});

savedSearchRoutes.delete("/users/me/saved-searches/:id", async (c) => {
  const user = c.get("authUser");
  if (!user) return failure(c, 401, "UNAUTHORIZED", "Not authenticated");

  const id = c.req.param("id");
  const result = await SavedSearch.findOneAndDelete({ id, userId: user.id });

  if (!result) {
    return failure(c, 404, "NOT_FOUND", "Saved search not found");
  }

  return success(c, { deleted: true }, 200);
});
