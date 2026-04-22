import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { isOwnerOrAdmin } from "../lib/auth-helpers";
import { getNumericQuery, getOptionalNumericQuery } from "../lib/request-utils";
import { requireAuth } from "../middleware/require-auth";
import { createAuditEvent } from "../store/audit";
import { getStore } from "../store/in-memory-db";
import type { LandRecord, LandUse } from "../store/types";
import type { AppEnv } from "../types";

const allowedSortFields = new Set(["createdAt", "price", "area"]);

export const landRoutes = new Hono<AppEnv>();

landRoutes.get("/lands", (c) => {
  const store = getStore();
  const page = getNumericQuery(c, "page", 1, { min: 1 });
  const pageSize = getNumericQuery(c, "pageSize", 20, { min: 1, max: 100 });
  const sort = c.req.query("sort") ?? "createdAt";
  const order = c.req.query("order") === "asc" ? "asc" : "desc";
  const use = c.req.query("use");
  const province = c.req.query("province");
  const district = c.req.query("district");
  const priceMin = getOptionalNumericQuery(c, "priceMin");
  const priceMax = getOptionalNumericQuery(c, "priceMax");
  const availableFrom = c.req.query("availableFrom");
  const availableTo = c.req.query("availableTo");

  if (!allowedSortFields.has(sort)) {
    return failure(c, 400, "VALIDATION_ERROR", "Invalid sort field", [
      { field: "sort", message: "Allowed values: createdAt, price, area" },
    ]);
  }

  let lands = Array.from(store.lands.values()).filter((land) => land.status === "active");

  if (use) {
    lands = lands.filter((land) => land.allowedUses.includes(use as LandUse));
  }

  if (province) {
    lands = lands.filter((land) => land.location.province.toLowerCase() === province.toLowerCase());
  }

  if (district) {
    lands = lands.filter((land) => land.location.district.toLowerCase() === district.toLowerCase());
  }

  if (priceMin !== undefined) {
    lands = lands.filter((land) => land.priceRule.pricePerMonth >= priceMin);
  }

  if (priceMax !== undefined) {
    lands = lands.filter((land) => land.priceRule.pricePerMonth <= priceMax);
  }

  if (availableFrom) {
    lands = lands.filter((land) => !land.availability.availableFrom || land.availability.availableFrom <= availableFrom);
  }

  if (availableTo) {
    lands = lands.filter((land) => !land.availability.availableTo || land.availability.availableTo >= availableTo);
  }

  lands.sort((a, b) => {
    const left = sort === "price" ? a.priceRule.pricePerMonth : sort === "area" ? a.area : Date.parse(a.createdAt);
    const right = sort === "price" ? b.priceRule.pricePerMonth : sort === "area" ? b.area : Date.parse(b.createdAt);

    if (left === right) {
      return 0;
    }
    return order === "asc" ? (left < right ? -1 : 1) : left > right ? -1 : 1;
  });

  const totalItems = lands.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = (page - 1) * pageSize;
  const items = lands.slice(start, start + pageSize);

  return success(c, {
    items,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
  });
});

landRoutes.get("/lands/:landId", (c) => {
  const store = getStore();
  const land = store.lands.get(c.req.param("landId"));
  if (!land || land.status === "inactive") {
    return failure(c, 404, "NOT_FOUND", "Land not found");
  }

  return success(c, land);
});

landRoutes.post("/lands", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const body = (await c.req.json().catch(() => null)) as Partial<LandRecord> | null;

  if (!body || !body.title || !body.area || !body.location || !body.priceRule || !body.allowedUses?.length) {
    return failure(c, 400, "VALIDATION_ERROR", "Missing required land fields", [
      { field: "title|area|location|priceRule|allowedUses", message: "Required" },
    ]);
  }

  const now = new Date().toISOString();
  const land: LandRecord = {
    id: `land_${crypto.randomUUID()}`,
    ownerId: authUser.id,
    title: body.title,
    description: body.description,
    area: Number(body.area),
    allowedUses: body.allowedUses,
    location: body.location,
    availability: body.availability ?? {},
    priceRule: body.priceRule,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  const store = getStore();
  store.lands.set(land.id, land);
  createAuditEvent({
    actor: authUser,
    entity: "land",
    action: "created",
    entityId: land.id,
  });

  return success(c, land, 201);
});

landRoutes.patch("/lands/:landId", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const store = getStore();
  const landId = c.req.param("landId");
  const current = store.lands.get(landId);
  if (!current) {
    return failure(c, 404, "NOT_FOUND", "Land not found");
  }

  if (!isOwnerOrAdmin(authUser, current.ownerId)) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can update this land");
  }

  const body = (await c.req.json().catch(() => null)) as Partial<LandRecord> | null;
  if (!body) {
    return failure(c, 400, "VALIDATION_ERROR", "Invalid JSON payload");
  }

  const updated: LandRecord = {
    ...current,
    ...body,
    id: current.id,
    ownerId: current.ownerId,
    updatedAt: new Date().toISOString(),
  };

  store.lands.set(updated.id, updated);
  createAuditEvent({
    actor: authUser,
    entity: "land",
    action: "updated",
    entityId: updated.id,
  });

  return success(c, updated);
});

landRoutes.patch("/lands/:landId/status", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const store = getStore();
  const landId = c.req.param("landId");
  const current = store.lands.get(landId);
  if (!current) {
    return failure(c, 404, "NOT_FOUND", "Land not found");
  }

  if (!isOwnerOrAdmin(authUser, current.ownerId)) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can update status");
  }

  const body = (await c.req.json().catch(() => null)) as { status?: LandRecord["status"] } | null;
  const status = body?.status;

  if (!status || !["draft", "active", "inactive"].includes(status)) {
    return failure(c, 400, "VALIDATION_ERROR", "Invalid land status");
  }

  const updated: LandRecord = {
    ...current,
    status,
    updatedAt: new Date().toISOString(),
  };
  store.lands.set(landId, updated);

  createAuditEvent({
    actor: authUser,
    entity: "land",
    action: "status_changed",
    entityId: landId,
    metadata: { status },
  });

  return success(c, updated);
});

landRoutes.delete("/lands/:landId", requireAuth, (c) => {
  const authUser = c.get("authUser");
  const store = getStore();
  const landId = c.req.param("landId");
  const current = store.lands.get(landId);
  if (!current) {
    return failure(c, 404, "NOT_FOUND", "Land not found");
  }

  if (!isOwnerOrAdmin(authUser, current.ownerId)) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can delete this land");
  }

  store.lands.delete(landId);
  createAuditEvent({
    actor: authUser,
    entity: "land",
    action: "deleted",
    entityId: landId,
  });

  return success(c, { deleted: true });
});
