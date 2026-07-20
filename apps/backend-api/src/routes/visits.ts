import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../middleware/require-auth";
import { Visit, Land, Notification } from "../db/schemas";
import { success, failure } from "../lib/api-response";
import { createVisitSchema, updateVisitStatusSchema } from "@terrashare/shared";
import type { AppEnv } from "../types";

export const visitRoutes = new Hono<AppEnv>();

visitRoutes.use("/lands/:id/visits", requireAuth);
visitRoutes.use("/users/me/visits", requireAuth);
visitRoutes.use("/visits/:id/status", requireAuth);

// Crear una visita
visitRoutes.post("/lands/:id/visits", async (c) => {
  const user = c.get("authUser");
  if (!user) return failure(c, 401, "UNAUTHORIZED", "Not authenticated");

  const landId = c.req.param("id");
  const land = await Land.findOne({ id: landId });
  if (!land) return failure(c, 404, "NOT_FOUND", "Land not found");

  if (land.ownerId === user.id) {
    return failure(c, 400, "BUSINESS_RULE_VIOLATION", "You cannot visit your own land");
  }

  let rawBody;
  try {
    rawBody = await c.req.json();
  } catch {
    return failure(c, 400, "VALIDATION_ERROR", "Invalid JSON");
  }

  const parsed = createVisitSchema.safeParse(rawBody);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    return failure(c, 400, "VALIDATION_ERROR", "Invalid input", details);
  }

  const id = randomUUID();
  const visit = await Visit.create({
    id,
    landId,
    visitorId: user.id,
    ownerId: land.ownerId,
    date: new Date(parsed.data.date),
    notes: parsed.data.notes,
  });

  // Notificar al dueño
  await Notification.create({
    id: randomUUID(),
    userId: land.ownerId,
    type: "new_visit",
    title: "Nueva solicitud de visita",
    body: `Tienes una nueva solicitud de visita para tu terreno.`,
  });

  return success(c, visit.toObject(), 201);
});

// Listar visitas del usuario (como visitante y como dueño)
visitRoutes.get("/users/me/visits", async (c) => {
  const user = c.get("authUser");
  if (!user) return failure(c, 401, "UNAUTHORIZED", "Not authenticated");

  const asVisitor = await Visit.find({ visitorId: user.id }).sort({ date: 1 }).lean();
  const asOwner = await Visit.find({ ownerId: user.id }).sort({ date: 1 }).lean();

  return success(c, { asVisitor, asOwner }, 200);
});

// Actualizar estado de visita
visitRoutes.patch("/visits/:id/status", async (c) => {
  const user = c.get("authUser");
  if (!user) return failure(c, 401, "UNAUTHORIZED", "Not authenticated");

  const id = c.req.param("id");
  const visit = await Visit.findOne({ id });
  if (!visit) return failure(c, 404, "NOT_FOUND", "Visit not found");

  if (visit.ownerId !== user.id && visit.visitorId !== user.id) {
    return failure(c, 403, "FORBIDDEN", "You are not involved in this visit");
  }

  let rawBody;
  try {
    rawBody = await c.req.json();
  } catch {
    return failure(c, 400, "VALIDATION_ERROR", "Invalid JSON");
  }

  const parsed = updateVisitStatusSchema.safeParse(rawBody);
  if (!parsed.success) {
    return failure(c, 400, "VALIDATION_ERROR", "Invalid input");
  }

  const { status } = parsed.data;

  // Solo el dueño puede aceptar o rechazar
  if ((status === "accepted" || status === "rejected") && user.id !== visit.ownerId) {
    return failure(c, 403, "FORBIDDEN", "Only the owner can accept or reject visits");
  }

  // Cualquiera puede cancelar o completar (simplificado)
  visit.status = status;
  await visit.save();

  // Notificar al otro participante
  const notifyTo = user.id === visit.ownerId ? visit.visitorId : visit.ownerId;
  await Notification.create({
    id: randomUUID(),
    userId: notifyTo,
    type: "visit_updated",
    title: "Visita actualizada",
    body: `El estado de una visita ha cambiado a ${status}.`,
  });

  return success(c, visit.toObject(), 200);
});
