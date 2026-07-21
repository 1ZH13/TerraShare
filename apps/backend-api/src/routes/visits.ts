import { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth";
import { success, failure } from "../lib/api-response";
import { Visit, Land, Notification } from "../db/schemas";
import type { AppEnv } from "../types";

export const visitRoutes = new Hono<AppEnv>();

visitRoutes.post("/lands/:id/visits", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const landId = c.req.param("id");
  const body = await c.req.json<{ proposedDate: string; proposedTime: string; message?: string }>();

  if (!body.proposedDate || !body.proposedTime) {
    return failure(c, 400, "VALIDATION_ERROR", "proposedDate and proposedTime are required");
  }

  const land = await Land.findOne({ id: landId }).lean();
  if (!land) {
    return failure(c, 404, "NOT_FOUND", "Land not found");
  }
  if (land.ownerId === authUser.id) {
    return failure(c, 403, "FORBIDDEN", "Cannot schedule a visit to your own land");
  }

  const visit = await Visit.create({
    id: crypto.randomUUID(),
    landId,
    tenantId: authUser.id,
    ownerId: land.ownerId,
    proposedDate: body.proposedDate,
    proposedTime: body.proposedTime,
    message: body.message,
    status: "pending",
  });

  await Notification.create({
    id: crypto.randomUUID(),
    userId: land.ownerId,
    type: "visit_request",
    title: "Nueva solicitud de visita",
    body: `Un usuario quiere visitar "${land.title}" el ${body.proposedDate} a las ${body.proposedTime}.`,
    read: false,
  });

  return success(c, visit, 201);
});

visitRoutes.get("/users/me/visits", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const visits = await Visit.find({
    $or: [{ tenantId: authUser.id }, { ownerId: authUser.id }],
  }).sort({ createdAt: -1 }).lean();
  return success(c, visits);
});

visitRoutes.patch("/visits/:id", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const visitId = c.req.param("id");
  const body = await c.req.json<{
    status: "confirmed" | "rescheduled" | "rejected";
    responseMessage?: string;
    proposedDate?: string;
    proposedTime?: string;
  }>();

  const visit = await Visit.findOne({ id: visitId }).lean();
  if (!visit) {
    return failure(c, 404, "NOT_FOUND", "Visit not found");
  }
  if (visit.ownerId !== authUser.id) {
    return failure(c, 403, "FORBIDDEN", "Only the land owner can update visit status");
  }

  const updated = await Visit.findOneAndUpdate(
    { id: visitId },
    {
      status: body.status,
      responseMessage: body.responseMessage,
      ...(body.proposedDate && { proposedDate: body.proposedDate }),
      ...(body.proposedTime && { proposedTime: body.proposedTime }),
    },
    { returnDocument: "after" },
  ).lean();

  const statusLabels: Record<string, string> = {
    confirmed: "confirmada",
    rescheduled: "reprogramada",
    rejected: "rechazada",
  };

  await Notification.create({
    id: crypto.randomUUID(),
    userId: visit.tenantId,
    type: "visit_update",
    title: `Visita ${statusLabels[body.status] || body.status}`,
    body: `Tu solicitud de visita fue ${statusLabels[body.status] || body.status}.`,
    read: false,
  });

  return success(c, updated);
});
