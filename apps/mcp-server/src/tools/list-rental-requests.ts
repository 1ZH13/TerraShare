import { z } from "zod";

import { Land, RentalRequest } from "@backend/db/schemas";
import { canListRentalRequests } from "@backend/lib/auth-helpers";
import { ToolError, type ToolDefinition } from "./define-tool";

/**
 * Tool HU-71 (#188): Listar solicitudes de alquiler. Devuelve las solicitudes
 * según el rol del usuario (arrendatario o dueño), con opción de filtrar por estado.
 */

export const listRentalRequestsInput = {
  status: z
    .enum(["draft", "pending_owner", "approved", "rejected", "cancelled", "pending_payment", "paid"])
    .optional()
    .describe("Filtrar por estado de la solicitud"),
};

export type ListRentalRequestsInput = z.infer<z.ZodObject<typeof listRentalRequestsInput>>;

export interface ListRentalRequestsResult {
  items: Record<string, unknown>[];
  total: number;
}

/**
 * Función pura de búsqueda (testeable de forma aislada). Busca solicitudes
 * de alquiler según el rol del usuario y opcionalmente filtra por estado.
 */
export async function listRentalRequests(rawInput: {
  actingUserId: string | null;
  status?: string;
}): Promise<ListRentalRequestsResult> {
  if (!rawInput.actingUserId) {
    throw new ToolError("Se requiere un usuario autenticado");
  }

  // Get lands owned by the user to check permissions
  const ownerLands = await Land.find({ ownerId: rawInput.actingUserId }).lean();
  const ownerLandIds = ownerLands.map((l) => l.id);

  // Build query based on permissions
  const permissionQuery = canListRentalRequests(
    { id: rawInput.actingUserId, role: "user" } as any,
    ownerLandIds
  );

  // Add status filter if provided
  const query: Record<string, unknown> = { ...permissionQuery };
  if (rawInput.status) {
    query.status = rawInput.status;
  }

  const docs = await RentalRequest.find(query).sort({ createdAt: -1 }).lean();

  const items = (docs as unknown as Record<string, unknown>[]).map((d) => {
    const { _id, __v, ...rest } = d;
    return rest;
  });

  return { items, total: items.length };
}

/**
 * Definición de la tool. Requiere usuario autenticado (scope tenant/owner).
 */
export const listRentalRequestsTool: ToolDefinition<typeof listRentalRequestsInput> = {
  name: "list_rental_requests",
  title: "Listar solicitudes de alquiler",
  description:
    "Devuelve las solicitudes de alquiler según el rol del usuario (arrendatario o dueño). Permite filtrar por estado.",
  inputSchema: listRentalRequestsInput,
  requires: "user",
  handler: (args, ctx) =>
    listRentalRequests({
      actingUserId: ctx.actingUser?.id ?? null,
      status: args.status as string | undefined,
    }),
};
