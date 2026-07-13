import { z, type ZodRawShape } from "zod";

import { User } from "@backend/db/schemas";
import { createAuditEvent } from "@backend/store/audit";
import type { ActingUser } from "../context";
import { ToolError, type ToolDefinition } from "./define-tool";

/**
 * Tool HU-91 (#208): Gestionar el estado de un usuario (admin). Espeja
 * `PATCH /admin/users/:userId/status`: un administrador activa o bloquea una
 * cuenta. Reglas: solo admin, **no puede modificar su propia cuenta**, y al ser
 * una acción sensible exige **confirmación explícita** (`confirm: true`).
 */

const manageUserStatusShape = {
  userId: z.string().min(1).describe("clerkUserId del usuario a activar/bloquear"),
  status: z.enum(["active", "blocked"]).describe("Nuevo estado de la cuenta"),
  reason: z.string().max(500).optional().describe("Motivo (auditoría)"),
  confirm: z
    .boolean()
    .describe("Confirmación explícita obligatoria de esta acción sensible (debe ser true)"),
};
const ManageUserStatusSchema = z.object(manageUserStatusShape);

// Tipado como `ZodRawShape` para que `TOOLS` unifique en server.ts.
export const manageUserStatusInput: ZodRawShape = manageUserStatusShape;

/** Resultado de la gestión de estado. */
export interface ManageUserStatusResult {
  userId: string;
  status: string;
  previousStatus: string;
  email?: string;
}

/**
 * Lógica pura (testeable): activa/bloquea una cuenta. El acceso admin lo
 * garantiza `requires: "admin"` en la tool.
 */
export async function manageUserStatus(
  rawInput: unknown,
  actingUser: Pick<ActingUser, "id" | "role">,
): Promise<ManageUserStatusResult> {
  const data = ManageUserStatusSchema.parse(rawInput ?? {});

  // Acción sensible: exige confirmación explícita.
  if (data.confirm !== true) {
    throw new ToolError("Esta acción sensible requiere confirmación explícita (confirm: true)");
  }

  // Regla del backend: un admin no puede modificar su propia cuenta.
  if (data.userId === actingUser.id) {
    throw new ToolError("No puedes modificar el estado de tu propia cuenta");
  }

  const user = await User.findOne({ clerkUserId: data.userId }).lean();
  if (!user) throw new ToolError("Usuario no encontrado");

  await User.updateOne({ clerkUserId: data.userId }, { status: data.status });

  await createAuditEvent({
    actor: { id: actingUser.id, role: actingUser.role },
    entity: "user",
    action: "status_changed",
    entityId: data.userId,
    metadata: { email: user.email, reason: data.reason, from: user.status, to: data.status },
  });

  return {
    userId: data.userId,
    status: data.status,
    previousStatus: user.status as string,
    email: user.email,
  };
}

/**
 * Definición de la tool. `requires: "admin"` → solo administradores; el
 * andamiaje aplica la puerta. Acción sensible: exige `confirm: true`.
 */
export const manageUserStatusTool: ToolDefinition<typeof manageUserStatusInput> = {
  name: "manage_user_status",
  title: "Gestionar estado de usuario (admin)",
  description:
    "Activa o bloquea una cuenta de usuario (solo admin). No permite modificar la propia cuenta. Acción sensible: requiere confirm: true. Registra auditoría y devuelve el estado anterior y el nuevo.",
  inputSchema: manageUserStatusInput,
  requires: "admin",
  handler: (args, ctx) => {
    const actingUser = ctx.actingUser as ActingUser;
    return manageUserStatus(args, { id: actingUser.id, role: actingUser.role });
  },
};
