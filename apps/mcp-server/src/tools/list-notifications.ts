import { z } from "zod";

import { Notification } from "@backend/db/schemas";
import { ToolError, type ToolDefinition } from "./define-tool";

/**
 * Tool HU-90 (#202): Listar notificaciones. Devuelve las notificaciones
 * del usuario autenticado, con opción de filtrar solo no leídas.
 *
 * NOTA: Esta tool consulta MongoDB directamente. El endpoint REST equivalente
 * (GET /notifications) usa un store in-memory. Hasta que REST migre a Mongo,
 * las notificaciones creadas vía REST no aparecerán aquí y viceversa.
 */

export const listNotificationsInput = {
  unreadOnly: z.boolean().optional().describe("Mostrar solo notificaciones no leídas"),
};

export type ListNotificationsInput = z.infer<z.ZodObject<typeof listNotificationsInput>>;

export interface ListNotificationsResult {
  items: Record<string, unknown>[];
  total: number;
}

/**
 * Función pura de búsqueda (testeable de forma aislada). Devuelve las
 * notificaciones del usuario, con filtro opcional de no leídas.
 */
export async function listNotifications(rawInput: {
  actingUserId: string | null;
  actingUserRole?: string;
  unreadOnly?: boolean;
}): Promise<ListNotificationsResult> {
  if (!rawInput.actingUserId) {
    throw new ToolError("Se requiere un usuario autenticado");
  }

  // Admin sees all notifications; regular users see only their own
  const isAdmin = rawInput.actingUserRole === "admin";
  const query: Record<string, unknown> = {};

  if (!isAdmin) {
    query.userId = rawInput.actingUserId;
  }

  if (rawInput.unreadOnly) {
    query.read = false;
  }

  const docs = await Notification.find(query).sort({ createdAt: -1 }).lean();

  const items = (docs as unknown as Record<string, unknown>[]).map((d) => {
    const { _id, __v, ...rest } = d;
    return rest;
  });

  return { items, total: items.length };
}

/**
 * Definición de la tool. Requiere usuario autenticado (scope user).
 */
export const listNotificationsTool: ToolDefinition<typeof listNotificationsInput> = {
  name: "list_notifications",
  title: "Listar notificaciones",
  description:
    "Devuelve las notificaciones del usuario. Los administradores ven todas. Permite filtrar por no leídas.",
  inputSchema: listNotificationsInput,
  requires: "user",
  handler: (args, ctx) =>
    listNotifications({
      actingUserId: ctx.actingUser?.id ?? null,
      actingUserRole: ctx.actingUser?.role,
      unreadOnly: args.unreadOnly as boolean | undefined,
    }),
};
