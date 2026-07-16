import { z } from "zod";

import { Notification } from "@backend/db/schemas";
import { canReadNotification } from "@backend/lib/auth-helpers";
import { ToolError, type ToolDefinition } from "./define-tool";

/**
 * Tool HU-91 (#202): Marcar notificación como leída. Cambia el estado
 * de una notificación a leída y registra la fecha de lectura.
 */

export const markNotificationReadInput = {
  notificationId: z.string().min(1).describe("ID de la notificación a marcar como leída"),
};

export type MarkNotificationReadInput = z.infer<z.ZodObject<typeof markNotificationReadInput>>;

/**
 * Función pura de actualización (testeable de forma aislada). Marca una
 * notificación como leída y registra la fecha de lectura.
 */
export async function markNotificationRead(rawInput: {
  notificationId: string;
  actingUserId: string | null;
  actingUserRole?: string;
}): Promise<Record<string, unknown>> {
  if (!rawInput.actingUserId) {
    throw new ToolError("Se requiere un usuario autenticado");
  }

  const notification = await Notification.findOne({ id: rawInput.notificationId }).lean();
  if (!notification) throw new ToolError("Notificación no encontrada");

  // Check permission: only owner or admin can mark as read
  if (!canReadNotification(
    { id: rawInput.actingUserId, role: rawInput.actingUserRole ?? "user" } as any,
    notification as any
  )) {
    throw new ToolError("No autorizado para modificar esta notificación");
  }

  const updated = await Notification.findOneAndUpdate(
    { id: rawInput.notificationId },
    { read: true, readAt: new Date().toISOString() },
    { returnDocument: "after" }
  ).lean();

  if (!updated) throw new ToolError("Error al actualizar la notificación");

  const { _id, __v, ...rest } = updated as unknown as Record<string, unknown>;
  return rest;
}

/**
 * Definición de la tool. Requiere usuario autenticado (scope user).
 */
export const markNotificationReadTool: ToolDefinition<typeof markNotificationReadInput> = {
  name: "mark_notification_read",
  title: "Marcar notificación como leída",
  description:
    "Marca una notificación como leída. Solo el propietario o un administrador pueden hacerlo.",
  inputSchema: markNotificationReadInput,
  requires: "user",
  handler: (args, ctx) =>
    markNotificationRead({
      notificationId: args.notificationId as string,
      actingUserId: ctx.actingUser?.id ?? null,
      actingUserRole: ctx.actingUser?.role,
    }),
};
