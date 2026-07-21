import { Hono } from "hono";
import { CreateLandSchema, UpdateLandSchema, UpdateLandStatusSchema } from "@terrashare/shared";

import { failure, success } from "../lib/api-response";
import { validateBody } from "../lib/validate";
import { canMutateLand } from "../lib/auth-helpers";
import { getNumericQuery, getOptionalNumericQuery } from "../lib/request-utils";
import { requireAuth } from "../middleware/require-auth";
import { rateLimitByUser } from "../middleware/rate-limit";
import { createAuditEvent as createAudit } from "../store/audit";
import { Land } from "../db/schemas";
import { matchSavedSearches } from "../lib/match-saved-searches";
import {
  ALLOWED_CONTENT_TYPES,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_LAND,
  deleteLandPhoto,
  getLandPhoto,
  photoUrl,
  storeLandPhoto,
} from "../lib/land-photos";
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
  // Excluye terrenos con borrado lógico (soft-delete, #328). `deletedAt: null`
  // en MongoDB también coincide con documentos que no tienen el campo (antiguos).
  const docs = (await Land.find({ ownerId: authUser.id, deletedAt: null }).lean()) as unknown as Record<string, unknown>[];
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

  const parsed = await validateBody(c, CreateLandSchema);
  if (!parsed.success) return parsed.response;
  // `data`: campos validados y tipados por el schema compartido. `extra`: el
  // cuerpo original, para los campos aún no cubiertos por el schema
  // (operation/salePrice/water/access/features/photos).
  const data = parsed.data;
  const extra = parsed.raw as Partial<LandRecord>;

  const now = new Date().toISOString();
  const land: LandRecord = {
    id: `land_${crypto.randomUUID()}`,
    ownerId: authUser.id,
    title: data.title,
    description: data.description,
    area: data.area,
    allowedUses: data.allowedUses,
    photos: extra.photos ?? [],
    location: data.location,
    availability: data.availability ?? {},
    priceRule: data.priceRule,
    status: "draft",
    operation: extra.operation ?? "alquiler",
    salePrice: extra.salePrice,
    water: extra.water,
    access: extra.access,
    features: extra.features ?? [],
    createdAt: now,
    updatedAt: now,
  };

  await Land.create(land);

  matchSavedSearches(land as any).catch((err) =>
    console.error({ level: "error", message: "Failed to match saved searches", error: err.message }),
  );

  await createAudit({
    actor: authUser,
    entity: "land",
    action: "created",
    entityId: land.id,
  });

  return success(c, land, 201);
});

// ─── Fotos de terrenos (GridFS, #148) ─────────────────────────────────────────

/** Sirve el binario de una foto. Público: los terrenos activos son públicos. */
landRoutes.get("/lands/:landId/photos/:fileId", async (c) => {
  const photo = await getLandPhoto(c.req.param("fileId"));
  if (!photo) {
    return failure(c, 404, "NOT_FOUND", "Photo not found");
  }
  // Las imágenes se embeben desde la web (otro origen en dev y en prod), así que
  // relajamos el CORP global (same-origin) a cross-origin solo para este binario.
  c.header("Cross-Origin-Resource-Policy", "cross-origin");
  return new Response(new Uint8Array(photo.buffer), {
    status: 200,
    headers: {
      "Content-Type": photo.contentType,
      "Content-Length": String(photo.buffer.length),
      // Las URLs son inmutables (id de archivo por foto): caché agresiva.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });
});

/** Sube una foto (multipart, campo `file`) a un terreno del que se es dueño. */
landRoutes.post("/lands/:landId/photos", requireAuth, rateLimitByUser(200), async (c) => {
  const authUser = c.get("authUser");
  const landId = c.req.param("landId");

  const current = clean<LandRecord>(
    (await Land.findOne({ id: landId }).lean()) as Record<string, unknown> | null,
  );
  if (!current) {
    return failure(c, 404, "NOT_FOUND", "Land not found");
  }
  if (!canMutateLand(authUser, current)) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can add photos to this land");
  }

  const existing = current.photos ?? [];
  if (existing.length >= MAX_PHOTOS_PER_LAND) {
    return failure(
      c,
      422,
      "BUSINESS_RULE_VIOLATION",
      `A land can have at most ${MAX_PHOTOS_PER_LAND} photos`,
    );
  }

  const body = await c.req.parseBody();
  const file = body["file"];
  if (!(file instanceof File)) {
    return failure(c, 400, "VALIDATION_ERROR", "Missing 'file' in multipart body");
  }
  if (!(ALLOWED_CONTENT_TYPES as readonly string[]).includes(file.type)) {
    return failure(
      c,
      400,
      "VALIDATION_ERROR",
      `Unsupported image type: ${file.type || "unknown"}. Allowed: ${ALLOWED_CONTENT_TYPES.join(", ")}`,
    );
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return failure(c, 422, "BUSINESS_RULE_VIOLATION", "Image exceeds the 5 MB limit");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileId = await storeLandPhoto({
    landId,
    buffer,
    contentType: file.type,
    filename: file.name || "photo",
  });
  const url = photoUrl(landId, fileId);
  const photos = [...existing, url];

  await Land.updateOne({ id: landId }, { $set: { photos, updatedAt: new Date().toISOString() } });
  await createAudit({ actor: authUser, entity: "land", action: "updated", entityId: landId });

  return success(c, { url, photos }, 201);
});

/** Elimina una foto de un terreno del que se es dueño. */
landRoutes.delete("/lands/:landId/photos/:fileId", requireAuth, rateLimitByUser(200), async (c) => {
  const authUser = c.get("authUser");
  const landId = c.req.param("landId");
  const fileId = c.req.param("fileId");

  const current = clean<LandRecord>(
    (await Land.findOne({ id: landId }).lean()) as Record<string, unknown> | null,
  );
  if (!current) {
    return failure(c, 404, "NOT_FOUND", "Land not found");
  }
  if (!canMutateLand(authUser, current)) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can remove photos from this land");
  }

  await deleteLandPhoto(fileId);
  const url = photoUrl(landId, fileId);
  const photos = (current.photos ?? []).filter((p) => p !== url);

  await Land.updateOne({ id: landId }, { $set: { photos, updatedAt: new Date().toISOString() } });
  await createAudit({ actor: authUser, entity: "land", action: "updated", entityId: landId });

  return success(c, { photos });
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

  const parsed = await validateBody(c, UpdateLandSchema);
  if (!parsed.success) return parsed.response;
  const body = parsed.raw as Partial<LandRecord>;

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

  const parsed = await validateBody(c, UpdateLandStatusSchema);
  if (!parsed.success) return parsed.response;
  const status = parsed.data.status;

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
