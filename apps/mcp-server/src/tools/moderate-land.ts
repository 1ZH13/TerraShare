import { z, type ZodRawShape } from "zod";

import { Land } from "@backend/db/schemas";
import { createAuditEvent } from "@backend/store/audit";
import type { ActingUser } from "../context";
import { notifyUser } from "../lib/notify";
import { ToolError, type ToolDefinition } from "./define-tool";

/**
 * Tool HU-90 (#207): Moderar un terreno (admin). Espeja
 * `PATCH /admin/lands/:landId/status`: un administrador cambia el estado de un
 * terreno (típicamente `inactive` para despublicar contenido que viole
 * políticas, o `active` para reactivarlo) y registra la acción en auditoría.
 */

const moderateLandShape = {
  landId: z.string().min(1).describe("ID del terreno a moderar"),
  status: z
    .enum(["active", "inactive"])
    .describe("Nuevo estado: 'inactive' despublica; 'active' reactiva"),
  reason: z.string().max(500).optional().describe("Motivo de la moderación (auditoría)"),
};
const ModerateLandSchema = z.object(moderateLandShape);

// Tipado como `ZodRawShape` para que `TOOLS` unifique en server.ts.
export const moderateLandInput: ZodRawShape = moderateLandShape;

/** Resultado de la moderación. */
export interface ModerateLandResult {
  landId: string;
  status: string;
  previousStatus: string;
  title: string;
}

/**
 * Lógica pura (testeable): cambia el estado del terreno y audita. El acceso
 * admin lo garantiza `requires: "admin"` en la tool.
 */
export async function moderateLand(
  rawInput: unknown,
  actingUser: Pick<ActingUser, "id" | "role">,
): Promise<ModerateLandResult> {
  const data = ModerateLandSchema.parse(rawInput ?? {});

  const land = await Land.findOne({ id: data.landId }).lean();
  if (!land) throw new ToolError("Terreno no encontrado");

  await Land.updateOne(
    { id: data.landId },
    { status: data.status, updatedAt: new Date().toISOString() },
  );

  // Misma semántica de auditoría que la API REST: active→approved, inactive→rejected.
  await createAuditEvent({
    actor: { id: actingUser.id, role: actingUser.role },
    entity: "land",
    action: data.status === "active" ? "approved" : "rejected",
    entityId: data.landId,
    metadata: { title: land.title, reason: data.reason, from: land.status, to: data.status },
  });

  // Capa E (#328): notifica al dueño del terreno la acción de moderación.
  try {
    if (land.ownerId) {
      await notifyUser({
        userId: land.ownerId as string,
        type: "land_moderated",
        title: data.status === "inactive" ? "Tu terreno fue despublicado" : "Tu terreno fue reactivado",
        body: data.reason ? `Motivo: ${data.reason}` : undefined,
      });
    }
  } catch (err) {
    console.error("[mcp-server] moderate_land: fallo al notificar al dueño", err);
  }

  return {
    landId: data.landId,
    status: data.status,
    previousStatus: land.status as string,
    title: land.title as string,
  };
}

/**
 * Definición de la tool. `requires: "admin"` → solo administradores; el andamiaje
 * aplica la puerta. Acción sensible (#328): confirmación explícita (A) + notifica
 * al dueño del terreno (E).
 */
export const moderateLandTool: ToolDefinition<typeof moderateLandInput> = {
  name: "moderate_land",
  title: "Moderar terreno (admin)",
  description:
    "Cambia el estado de un terreno (solo admin): 'inactive' lo despublica, 'active' lo reactiva. Requiere confirm: true. Registra auditoría, notifica al dueño y devuelve el estado anterior y el nuevo.",
  inputSchema: moderateLandInput,
  requires: "admin",
  sensitive: { confirm: true },
  handler: (args, ctx) => {
    const actingUser = ctx.actingUser as ActingUser;
    return moderateLand(args, { id: actingUser.id, role: actingUser.role });
  },
};
