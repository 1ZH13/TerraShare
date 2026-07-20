import { z } from "zod";

import { Land, AuditEvent } from "@backend/db/schemas";
import { notifyUser } from "../lib/notify";
import { ToolError, type ToolDefinition } from "./define-tool";
import { canMutateLand } from "../permissions";

// La confirmación (capa B, vista previa) la gestiona el andamiaje `registerTool`
// vía `sensitive` — no se declara `confirm` aquí.
const deleteLandInput = {
  landId: z.string().min(1).describe("ID del terreno a eliminar"),
};

export type DeleteLandInput = z.infer<z.ZodObject<typeof deleteLandInput>>;

export async function deleteLand(
  rawInput: unknown,
  actingUser: { id: string; role: string },
): Promise<Record<string, unknown>> {
  const schema = z.object(deleteLandInput);
  const input = schema.parse(rawInput ?? {});

  const current = await Land.findOne({ id: input.landId }).lean();
  if (!current) throw new ToolError("Terreno no encontrado");

  if (!canMutateLand(actingUser as never, { ownerId: current.ownerId } as never)) {
    throw new ToolError("No autorizado para eliminar este terreno");
  }

  // Soft-delete (#328): no se borra físicamente. Se marca con `deletedAt` y se
  // pasa a `inactive` (sale del catálogo público), de modo que sea recuperable.
  const now = new Date();
  await Land.updateOne(
    { id: input.landId },
    { $set: { status: "inactive", deletedAt: now, updatedAt: now } },
  );

  await AuditEvent.create({
    id: `audit_${crypto.randomUUID()}`,
    actorId: actingUser.id,
    actorRole: actingUser.role as "user" | "admin",
    entity: "land",
    action: "deleted",
    entityId: input.landId,
  });

  // Capa E (#328): notifica al dueño que su terreno fue retirado.
  try {
    if (current.ownerId) {
      await notifyUser({
        userId: current.ownerId,
        type: "land_deleted",
        title: "Tu terreno fue retirado",
        body: `El terreno "${current.title}" se retiró del catálogo (recuperable).`,
      });
    }
  } catch (err) {
    console.error("[mcp-server] delete_land: fallo al notificar al dueño", err);
  }

  return { deleted: true, landId: input.landId, recoverable: true };
}

/**
 * Vista previa (capa B, #328): resume el terreno a eliminar SIN borrarlo.
 */
export async function deleteLandPreview(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { landId } = z.object(deleteLandInput).parse(args ?? {});
  const land = await Land.findOne({ id: landId }).lean();
  if (!land) throw new ToolError("Terreno no encontrado");
  return {
    landId: land.id,
    title: land.title,
    status: land.status,
    ownerId: land.ownerId,
    note: "El borrado es lógico (soft-delete): el terreno se retira del catálogo pero es recuperable.",
  };
}

export const deleteLandTool: ToolDefinition<typeof deleteLandInput> = {
  name: "delete_land",
  title: "Eliminar terreno",
  description:
    "Retira un terreno del catálogo (borrado lógico recuperable). Solo el propietario o un administrador. Acción sensible: la 1ª llamada devuelve una vista previa y un confirmationToken; el retiro se aplica al repetir con ese token. Notifica al dueño.",
  inputSchema: deleteLandInput,
  requires: "user",
  sensitive: {
    preview: (args) => deleteLandPreview(args),
  },
  handler: async (args, ctx) => {
    const actingUser = ctx.actingUser!;
    return deleteLand(args, actingUser);
  },
};
