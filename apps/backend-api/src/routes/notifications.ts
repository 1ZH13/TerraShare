import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { requireAuth } from "../middleware/require-auth";
import { getStore } from "../store/in-memory-db";
import type { AppEnv } from "../types";

export const notificationRoutes = new Hono<AppEnv>();

notificationRoutes.get("/notifications", requireAuth, (c) => {
  const authUser = c.get("authUser");
  const store = getStore();

  const items = Array.from(store.notifications.values())
    .filter((n) => n.userId === authUser.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return success(c, items);
});

notificationRoutes.get("/notifications/:notificationId", requireAuth, (c) => {
  const authUser = c.get("authUser");
  const store = getStore();
  const notification = store.notifications.get(c.req.param("notificationId"));

  if (!notification) {
    return failure(c, 404, "NOT_FOUND", "Notification not found");
  }

  if (notification.userId !== authUser.id && authUser.role !== "admin") {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this notification");
  }

  return success(c, notification);
});

notificationRoutes.patch("/notifications/:notificationId/read", requireAuth, (c) => {
  const authUser = c.get("authUser");
  const store = getStore();
  const notification = store.notifications.get(c.req.param("notificationId"));

  if (!notification) {
    return failure(c, 404, "NOT_FOUND", "Notification not found");
  }

  if (notification.userId !== authUser.id && authUser.role !== "admin") {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this notification");
  }

  notification.read = true;
  notification.readAt = new Date().toISOString();
  store.notifications.set(notification.id, notification);

  return success(c, notification);
});