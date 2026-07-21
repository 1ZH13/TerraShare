import { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth";
import { success, failure } from "../lib/api-response";
import { SavedSearch } from "../db/schemas";
import type { AppEnv } from "../types";

const MAX_SAVED_SEARCHES = 10;

export const savedSearchRoutes = new Hono<AppEnv>();

savedSearchRoutes.get("/users/me/saved-searches", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const searches = await SavedSearch.find({ userId: authUser.id })
    .sort({ createdAt: -1 })
    .lean();
  return success(c, searches);
});

savedSearchRoutes.post("/users/me/saved-searches", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const body = await c.req.json<{ name: string; filters: Record<string, unknown> }>();

  if (!body.name || body.name.trim().length === 0) {
    return failure(c, 400, "VALIDATION_ERROR", "Name is required");
  }
  if (!body.filters || typeof body.filters !== "object") {
    return failure(c, 400, "VALIDATION_ERROR", "Filters are required");
  }

  const count = await SavedSearch.countDocuments({ userId: authUser.id });
  if (count >= MAX_SAVED_SEARCHES) {
    return failure(c, 400, "VALIDATION_ERROR", `Maximum ${MAX_SAVED_SEARCHES} saved searches allowed`);
  }

  const search = await SavedSearch.create({
    id: crypto.randomUUID(),
    userId: authUser.id,
    name: body.name.trim(),
    filters: body.filters,
  });

  return success(c, search, 201);
});

savedSearchRoutes.delete("/users/me/saved-searches/:id", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const id = c.req.param("id");

  const search = await SavedSearch.findOneAndDelete({ id, userId: authUser.id });
  if (!search) {
    return failure(c, 404, "NOT_FOUND", "Saved search not found");
  }

  return success(c, { deleted: true });
});
