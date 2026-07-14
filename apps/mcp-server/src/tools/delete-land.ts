import { z } from "zod";

import { Land, AuditEvent } from "@backend/db/schemas";
import { ToolError, type ToolDefinition } from "./define-tool";
import { canMutateLand } from "../permissions";

const deleteLandInput = {
  landId: z.string().min(1).describe("ID del terreno a eliminar"),
  confirm: z.boolean().optional().describe("Debe ser true para confirmar la eliminación"),
};

export type DeleteLandInput = z.infer<z.ZodObject<typeof deleteLandInput>>;

export async function deleteLand(
  rawInput: unknown,
  actingUser: { id: string; role: string },
): Promise<Record<string, unknown>> {
  const schema = z.object(deleteLandInput);
  const input = schema.parse(rawInput ?? {});

  if (input.confirm !== true) {
    throw new ToolError("Debes confirmar la eliminación con confirm: true");
  }

  const current = await Land.findOne({ id: input.landId }).lean();
  if (!current) throw new ToolError("Terreno no encontrado");

  if (!canMutateLand(actingUser as never, { ownerId: current.ownerId } as never)) {
    throw new ToolError("No autorizado para eliminar este terreno");
  }

  await Land.deleteOne({ id: input.landId });

  await AuditEvent.create({
    id: `audit_${crypto.randomUUID()}`,
    actorId: actingUser.id,
    actorRole: actingUser.role as "user" | "admin",
    entity: "land",
    action: "deleted",
    entityId: input.landId,
  });

  return { deleted: true, landId: input.landId };
}

export const deleteLandTool: ToolDefinition<typeof deleteLandInput> = {
  name: "delete_land",
  title: "Eliminar terreno",
  description:
    "Elimina un terreno existente de forma permanente. Requiere confirmación explícita. Solo el propietario o un administrador pueden eliminarlo.",
  inputSchema: deleteLandInput,
  requires: "user",
  handler: async (args, ctx) => {
    const actingUser = ctx.actingUser!;
    return deleteLand(args, actingUser);
  },
};
