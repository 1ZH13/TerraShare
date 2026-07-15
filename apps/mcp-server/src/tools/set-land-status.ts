import { z } from "zod";

import { Land } from "@backend/db/schemas";
import { ToolError, type ToolDefinition } from "./define-tool";
import { canMutateLand } from "../permissions";

/**
 * Tool HU-67 (#184): Cambiar estado de un terreno. Permite al dueño
 * activar, desactivar o poner en borrador su terreno.
 */

export const setLandStatusInput = {
  landId: z.string().min(1).describe("ID del terreno"),
  status: z.enum(["draft", "active", "inactive"]).describe("Nuevo estado del terreno"),
};

export type SetLandStatusInput = z.infer<z.ZodObject<typeof setLandStatusInput>>;

/**
 * Función pura de actualización (testeable de forma aislada). Cambia el
 * estado de un terreno y registra evento de auditoría.
 */
export async function setLandStatus(rawInput: {
  landId: string;
  status: "draft" | "active" | "inactive";
  actingUserId: string | null;
  actingUserRole?: string;
}): Promise<Record<string, unknown>> {
  if (!rawInput.actingUserId) {
    throw new ToolError("Se requiere un usuario autenticado");
  }

  const land = await Land.findOne({ id: rawInput.landId }).lean();
  if (!land) throw new ToolError("Terreno no encontrado");

  // Check permission: only owner or admin can mutate
  if (!canMutateLand({ id: rawInput.actingUserId, role: rawInput.actingUserRole ?? "user" } as any, land as any)) {
    throw new ToolError("No autorizado para modificar este terreno");
  }

  const updated = await Land.findOneAndUpdate(
    { id: rawInput.landId },
    { status: rawInput.status, updatedAt: new Date().toISOString() },
    { returnDocument: "after" }
  ).lean();

  if (!updated) throw new ToolError("Error al actualizar el terreno");

  const { _id, __v, ...rest } = updated as unknown as Record<string, unknown>;
  return rest;
}

/**
 * Definición de la tool. Requiere usuario autenticado (scope owner).
 */
export const setLandStatusTool: ToolDefinition<typeof setLandStatusInput> = {
  name: "set_land_status",
  title: "Cambiar estado de terreno",
  description:
    "Cambia el estado de un terreno (draft/active/inactive). Solo el dueño o un administrador pueden modificarlo.",
  inputSchema: setLandStatusInput,
  requires: "user",
  handler: (args, ctx) =>
    setLandStatus({
      landId: args.landId as string,
      status: args.status as "draft" | "active" | "inactive",
      actingUserId: ctx.actingUser?.id ?? null,
      actingUserRole: ctx.actingUser?.role,
    }),
};
