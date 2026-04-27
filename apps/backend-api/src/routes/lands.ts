import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { isOwnerOrAdmin } from "../lib/auth-helpers";
import { getNumericQuery, getOptionalNumericQuery } from "../lib/request-utils";
import { requireAuth } from "../middleware/require-auth";
import { createAuditEvent as createAudit } from "../store/audit";
import { listLands, getLandById, createLand, updateLand, deleteLand } from "../db/collections";
import { getStore } from "../store/in-memory-db";
import type { LandRecord, LandUse } from "../store/types";
import type { AppEnv } from "../types";

const allowedSortFields = new Set(["createdAt", "price", "area"]);

function useMongoDB(): boolean {
  try {
    const { getDatabase } = require("../config/database");
    return !!getDatabase();
  } catch {
    return false;
  }
}

export const landRoutes = new Hono<AppEnv>();

landRoutes.get("/lands", async (c) => {
  const mongoOk = useMongoDB();
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

  let lands: LandRecord[];
  
  if (mongoOk) {
    const filters: Record<string, string> = {};
    if (use) filters.status = "active";
    lands = await listLands({ status: "active" }) as LandRecord[];
  } else {
    lands = Array.from(getStore().lands.values()).filter((land) => land.status === "active");
  }

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

landRoutes.get("/lands/:landId", async (c) => {
  const mongoOk = useMongoDB();
  const landId = c.req.param("landId");
  
  let land: LandRecord | undefined;
  if (mongoOk) {
    land = await getLandById(landId) as LandRecord | undefined;
  } else {
    land = getStore().lands.get(landId);
  }
  
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

  const mongoOk = useMongoDB();
  if (mongoOk) {
    await createLand(land);
  } else {
    getStore().lands.set(land.id, land);
  }
  
  createAudit({
    actor: authUser,
    entity: "land",
    action: "created",
    entityId: land.id,
  });

  return success(c, land, 201);
});

landRoutes.patch("/lands/:landId", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const landId = c.req.param("landId");
  const mongoOk = useMongoDB();
  
  let current: LandRecord | undefined;
  if (mongoOk) {
    current = await getLandById(landId) as LandRecord | undefined;
  } else {
    current = getStore().lands.get(landId);
  }
  
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

  if (mongoOk) {
    await updateLand(landId, updated);
  } else {
    getStore().lands.set(updated.id, updated);
  }
  
  createAudit({
    actor: authUser,
    entity: "land",
    action: "updated",
    entityId: updated.id,
  });

  return success(c, updated);
});

landRoutes.patch("/lands/:landId/status", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const landId = c.req.param("landId");
  const mongoOk = useMongoDB();
  
  let current: LandRecord | undefined;
  if (mongoOk) {
    current = await getLandById(landId) as LandRecord | undefined;
  } else {
    current = getStore().lands.get(landId);
  }
  
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
  
  if (mongoOk) {
    await updateLand(landId, updated);
  } else {
    getStore().lands.set(landId, updated);
  }

  createAudit({
    actor: authUser,
    entity: "land",
    action: "status_changed",
    entityId: landId,
    metadata: { status },
  });

  return success(c, updated);
});

landRoutes.delete("/lands/:landId", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const landId = c.req.param("landId");
  const mongoOk = useMongoDB();
  
  let current: LandRecord | undefined;
  if (mongoOk) {
    current = await getLandById(landId) as LandRecord | undefined;
  } else {
    current = getStore().lands.get(landId);
  }
  
  if (!current) {
    return failure(c, 404, "NOT_FOUND", "Land not found");
  }

  if (!isOwnerOrAdmin(authUser, current.ownerId)) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can delete this land");
  }

  if (mongoOk) {
    await deleteLand(landId);
  } else {
    getStore().lands.delete(landId);
  }
  
  createAudit({
    actor: authUser,
    entity: "land",
    action: "deleted",
    entityId: landId,
  });

  return success(c, { deleted: true });
});
