import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { canReadNotification } from "../lib/auth-helpers";
import { requireAuth } from "../middleware/require-auth";
import { Notification } from "../db/schemas";
import type { AppEnv } from "../types";

export const notificationRoutes = new Hono<AppEnv>();

/**
 * Centro de notificaciones. Lee y escribe sobre el modelo `Notification` de
 * Mongo, que es donde las generan realmente los flujos del producto: alertas de
 * búsquedas guardadas (HU-99) y las acciones sensibles del servidor MCP (#328).
 *
 * Antes estas rutas leían del store en memoria, que nadie alimentaba, así que
 * todas esas notificaciones quedaban invisibles para el usuario.
 */

/** Quita los campos internos de Mongo de un documento `lean`. */
function clean<T>(doc: Record<string, unknown> | null | undefined): T | undefined {
  if (!doc) return undefined;
  const { _id, __v, ...rest } = doc;
  return rest as T;
}

notificationRoutes.get("/notifications", requireAuth, async (c) => {
  const authUser = c.get("authUser");

  const docs = (await Notification.find({ userId: authUser.id })
    .sort({ createdAt: -1 })
    .lean()) as unknown as Record<string, unknown>[];

  return success(c, docs.map((d) => clean(d)));
});

notificationRoutes.get("/notifications/:notificationId", requireAuth, async (c) => {
  const authUser = c.get("authUser");

  const doc = (await Notification.findOne({ id: c.req.param("notificationId") })
    .lean()) as Record<string, unknown> | null;
  if (!doc) {
    return failure(c, 404, "NOT_FOUND", "Notification not found");
  }

  if (!canReadNotification(authUser, doc as unknown as { userId: string })) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this notification");
  }

  return success(c, clean(doc));
});

notificationRoutes.patch("/notifications/:notificationId/read", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const notificationId = c.req.param("notificationId");

  const doc = (await Notification.findOne({ id: notificationId })
    .lean()) as Record<string, unknown> | null;
  if (!doc) {
    return failure(c, 404, "NOT_FOUND", "Notification not found");
  }

  if (!canReadNotification(authUser, doc as unknown as { userId: string })) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this notification");
  }

  await Notification.updateOne(
    { id: notificationId },
    { $set: { read: true, readAt: new Date().toISOString() } },
  );

  const updated = (await Notification.findOne({ id: notificationId })
    .lean()) as Record<string, unknown> | null;

  return success(c, clean(updated));
});
