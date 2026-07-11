import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { requireAuth } from "../middleware/require-auth";
import { rateLimitByUser } from "../middleware/rate-limit";
import { Favorite, Land } from "../db/schemas";
import type { LandRecord } from "../store/types";
import type { AppEnv } from "../types";

/**
 * Favoritos / "Guardados" de terrenos (#147).
 *
 * El usuario guarda terrenos desde el catálogo y el detalle; la Home (Busco) los
 * muestra en la sección "Guardados". Modelado como una colección propia
 * (`Favorite`) con índice único (userId, landId) en lugar de un array embebido
 * en el usuario: evita condiciones de carrera al guardar/quitar y escala mejor.
 */
export const favoriteRoutes = new Hono<AppEnv>();

/** Elimina los campos internos de Mongo de un documento `lean`. */
function clean<T>(doc: Record<string, unknown> | null | undefined): T | undefined {
  if (!doc) return undefined;
  const { _id, __v, ...rest } = doc;
  return rest as T;
}

/**
 * Lista los terrenos guardados por el usuario, más recientes primero. Devuelve
 * los registros completos de terreno para que la Home pinte tarjetas reales.
 * Los terrenos que ya no estén activos (borrados/despublicados) se omiten.
 */
favoriteRoutes.get("/users/me/favorites", requireAuth, rateLimitByUser(200), async (c) => {
  const authUser = c.get("authUser");

  const favorites = await Favorite.find({ userId: authUser.id })
    .sort({ createdAt: -1 })
    .lean();
  const landIds = favorites.map((f) => f.landId);
  if (landIds.length === 0) {
    return success(c, []);
  }

  const docs = (await Land.find({
    id: { $in: landIds },
    status: { $ne: "inactive" },
  }).lean()) as unknown as Record<string, unknown>[];

  const byId = new Map(docs.map((d) => [d.id as string, clean<LandRecord>(d)!]));
  // Conservar el orden por fecha de guardado (el $in no lo garantiza).
  const lands = landIds.map((id) => byId.get(id)).filter((l): l is LandRecord => l !== undefined);

  return success(c, lands);
});

/**
 * Guarda un terreno. Idempotente: guardar dos veces devuelve 200 sin duplicar
 * (el índice único protege ante carreras). Valida que el terreno exista y esté
 * publicado antes de guardarlo.
 */
favoriteRoutes.post("/users/me/favorites/:landId", requireAuth, rateLimitByUser(200), async (c) => {
  const authUser = c.get("authUser");
  const landId = c.req.param("landId");

  const land = await Land.findOne({ id: landId }).lean();
  if (!land || land.status === "inactive") {
    return failure(c, 404, "NOT_FOUND", "Land not found");
  }

  await Favorite.updateOne(
    { userId: authUser.id, landId },
    { $setOnInsert: { userId: authUser.id, landId } },
    { upsert: true },
  );

  return success(c, { landId, favorited: true });
});

/**
 * Quita un terreno de guardados. Idempotente: quitar algo no guardado devuelve
 * 200 igualmente (estado final deseado ya alcanzado).
 */
favoriteRoutes.delete("/users/me/favorites/:landId", requireAuth, rateLimitByUser(200), async (c) => {
  const authUser = c.get("authUser");
  const landId = c.req.param("landId");

  await Favorite.deleteOne({ userId: authUser.id, landId });

  return success(c, { landId, favorited: false });
});
