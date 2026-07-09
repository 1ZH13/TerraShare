import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { canMutateLand } from "../lib/auth-helpers";
import { getNumericQuery, getOptionalNumericQuery } from "../lib/request-utils";
import { requireAuth } from "../middleware/require-auth";
import { rateLimitByUser } from "../middleware/rate-limit";
import { createAuditEvent as createAudit } from "../store/audit";
import { Land } from "../db/schemas";
import type { LandRecord } from "../store/types";
import type { AppEnv } from "../types";

const allowedSortFields = new Set(["createdAt", "price", "area"]);

/** Elimina los campos internos de Mongo de un documento `lean`. */
function clean<T>(doc: Record<string, unknown> | null | undefined): T | undefined {
  if (!doc) return undefined;
  const { _id, __v, ...rest } = doc;
  return rest as T;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Construye la query de Mongo con TODOS los filtros de catálogo (A-4): antes se
 * resolvían en JS sobre el resultado completo; ahora los resuelve la BD.
 */
function buildLandQuery(params: {
  use?: string;
  province?: string;
  district?: string;
  priceMin?: number;
  priceMax?: number;
  availableFrom?: string;
  availableTo?: string;
  q?: string;
}): Record<string, unknown> {
  const query: Record<string, unknown> = { status: "active" };

  if (params.use) query.allowedUses = params.use;
  if (params.province) {
    query["location.province"] = new RegExp(`^${escapeRegex(params.province)}$`, "i");
  }
  if (params.district) {
    query["location.district"] = new RegExp(`^${escapeRegex(params.district)}$`, "i");
  }

  if (params.priceMin !== undefined || params.priceMax !== undefined) {
    const price: Record<string, number> = {};
    if (params.priceMin !== undefined) price.$gte = params.priceMin;
    if (params.priceMax !== undefined) price.$lte = params.priceMax;
    query["priceRule.pricePerMonth"] = price;
  }

  const and: Record<string, unknown>[] = [];
  if (params.availableFrom) {
    and.push({
      $or: [
        { "availability.availableFrom": { $in: [null, undefined, ""] } },
        { "availability.availableFrom": { $lte: params.availableFrom } },
      ],
    });
  }
  if (params.availableTo) {
    and.push({
      $or: [
        { "availability.availableTo": { $in: [null, undefined, ""] } },
        { "availability.availableTo": { $gte: params.availableTo } },
      ],
    });
  }
  if (and.length > 0) query.$and = and;

  if (params.q) query.$text = { $search: params.q };

  return query;
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export const landRoutes = new Hono<AppEnv>();

landRoutes.get("/lands", async (c) => {
  const page = getNumericQuery(c, "page", 1, { min: 1 });
  const pageSize = getNumericQuery(c, "pageSize", 20, { min: 1, max: 100 });
  const sort = c.req.query("sort") ?? "createdAt";
  const order = c.req.query("order") === "asc" ? "asc" : "desc";
  const lat = getOptionalNumericQuery(c, "lat");
  const lng = getOptionalNumericQuery(c, "lng");
  const radius = getOptionalNumericQuery(c, "radius") ?? 10;

  if (!allowedSortFields.has(sort)) {
    return failure(c, 400, "VALIDATION_ERROR", "Invalid sort field", [
      { field: "sort", message: "Allowed values: createdAt, price, area" },
    ]);
  }

  const query = buildLandQuery({
    use: c.req.query("use"),
    province: c.req.query("province"),
    district: c.req.query("district"),
    priceMin: getOptionalNumericQuery(c, "priceMin"),
    priceMax: getOptionalNumericQuery(c, "priceMax"),
    availableFrom: c.req.query("availableFrom"),
    availableTo: c.req.query("availableTo"),
    q: c.req.query("q"),
  });

  const docs = (await Land.find(query).lean()) as unknown as Record<string, unknown>[];
  let lands = docs.map((d) => clean<LandRecord>(d)!);

  // Filtro geográfico (haversine) en JS: el índice es plano, no 2dsphere.
  if (lat !== undefined && lng !== undefined) {
    lands = lands.filter((land) => {
      if (land.location.lat === undefined || land.location.lng === undefined) return false;
      return distanceKm(lat, lng, land.location.lat, land.location.lng) <= radius;
    });
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

// Must be registered before "/lands/:landId"; otherwise "me" is captured as a
// landId and this route becomes unreachable (404).
landRoutes.get("/lands/me", requireAuth, rateLimitByUser(200), async (c) => {
  const authUser = c.get("authUser");
  const docs = (await Land.find({ ownerId: authUser.id }).lean()) as unknown as Record<string, unknown>[];
  const lands = docs.map((d) => clean<LandRecord>(d)!);
  return success(c, lands);
});

landRoutes.get("/lands/:landId", async (c) => {
  const landId = c.req.param("landId");
  const land = clean<LandRecord>(
    (await Land.findOne({ id: landId }).lean()) as Record<string, unknown> | null,
  );

  if (!land || land.status === "inactive") {
    return failure(c, 404, "NOT_FOUND", "Land not found");
  }

  return success(c, land);
});

landRoutes.post("/lands", requireAuth, rateLimitByUser(200), async (c) => {
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
    photos: body.photos ?? [],
    location: body.location,
    availability: body.availability ?? {},
    priceRule: body.priceRule,
    status: "draft",
    operation: body.operation ?? "alquiler",
    salePrice: body.salePrice,
    water: body.water,
    access: body.access,
    features: body.features ?? [],
    createdAt: now,
    updatedAt: now,
  };

  await Land.create(land);

  await createAudit({
    actor: authUser,
    entity: "land",
    action: "created",
    entityId: land.id,
  });

  return success(c, land, 201);
});

landRoutes.patch("/lands/:landId", requireAuth, rateLimitByUser(200), async (c) => {
  const authUser = c.get("authUser");
  const landId = c.req.param("landId");

  const current = clean<LandRecord>(
    (await Land.findOne({ id: landId }).lean()) as Record<string, unknown> | null,
  );
  if (!current) {
    return failure(c, 404, "NOT_FOUND", "Land not found");
  }

  if (!canMutateLand(authUser, current)) {
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

  await Land.findOneAndUpdate({ id: landId }, { $set: updated });

  await createAudit({
    actor: authUser,
    entity: "land",
    action: "updated",
    entityId: updated.id,
  });

  return success(c, updated);
});

landRoutes.patch("/lands/:landId/status", requireAuth, rateLimitByUser(200), async (c) => {
  const authUser = c.get("authUser");
  const landId = c.req.param("landId");

  const current = clean<LandRecord>(
    (await Land.findOne({ id: landId }).lean()) as Record<string, unknown> | null,
  );
  if (!current) {
    return failure(c, 404, "NOT_FOUND", "Land not found");
  }

  if (!canMutateLand(authUser, current)) {
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

  await Land.findOneAndUpdate({ id: landId }, { $set: { status, updatedAt: updated.updatedAt } });

  await createAudit({
    actor: authUser,
    entity: "land",
    action: "status_changed",
    entityId: landId,
    metadata: { status },
  });

  return success(c, updated);
});

landRoutes.delete("/lands/:landId", requireAuth, rateLimitByUser(200), async (c) => {
  const authUser = c.get("authUser");
  const landId = c.req.param("landId");

  const current = clean<LandRecord>(
    (await Land.findOne({ id: landId }).lean()) as Record<string, unknown> | null,
  );
  if (!current) {
    return failure(c, 404, "NOT_FOUND", "Land not found");
  }

  if (!canMutateLand(authUser, current)) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can delete this land");
  }

  await Land.deleteOne({ id: landId });

  await createAudit({
    actor: authUser,
    entity: "land",
    action: "deleted",
    entityId: landId,
  });

  return success(c, { deleted: true });
});
