import { z, type ZodRawShape } from "zod";

import { User } from "@backend/db/schemas";
import { createAuditEvent } from "@backend/store/audit";
import type { ActingUser } from "../context";
import { notifyUser } from "../lib/notify";
import { ToolError, type ToolDefinition } from "./define-tool";

/**
 * Tool HU-91 (#208): Gestionar el estado de un usuario (admin). Espeja
 * `PATCH /admin/users/:userId/status`: un administrador activa o bloquea una
 * cuenta. Reglas: solo admin, **no puede modificar su propia cuenta**, y al ser
 * una acción sensible exige **confirmación explícita** (`confirm: true`).
 */

// La confirmación (capa B, vista previa) la gestiona el andamiaje `registerTool`
// vía `sensitive` — no se declara `confirm` aquí.
const manageUserStatusShape = {
  userId: z.string().min(1).describe("clerkUserId del usuario a activar/bloquear"),
  status: z.enum(["active", "blocked"]).describe("Nuevo estado de la cuenta"),
  reason: z.string().max(500).optional().describe("Motivo (auditoría)"),
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

  // Capa E (#328): notifica al usuario afectado el cambio de estado de su cuenta.
  try {
    await notifyUser({
      userId: data.userId,
      type: "account_status_changed",
      title: data.status === "blocked" ? "Tu cuenta fue bloqueada" : "Tu cuenta fue reactivada",
      body: data.reason ? `Motivo: ${data.reason}` : undefined,
    });
  } catch (err) {
    console.error("[mcp-server] manage_user_status: fallo al notificar al usuario", err);
  }

  return {
    userId: data.userId,
    status: data.status,
    previousStatus: user.status as string,
    email: user.email,
  };
}

/**
 * Vista previa (capa B, #328): resume el cambio de estado SIN ejecutarlo.
 */
export async function manageUserStatusPreview(
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const data = ManageUserStatusSchema.parse(args ?? {});
  const user = await User.findOne({ clerkUserId: data.userId }).lean();
  if (!user) throw new ToolError("Usuario no encontrado");
  return {
    userId: data.userId,
    email: user.email,
    currentStatus: user.status,
    newStatus: data.status,
    reason: data.reason,
  };
}

/**
 * Definición de la tool. `requires: "admin"` → solo administradores; el andamiaje
 * aplica la puerta. Acción sensible (#328): vista previa en 2 pasos (B) + notifica
 * al usuario afectado (E).
 */
export const manageUserStatusTool: ToolDefinition<typeof manageUserStatusInput> = {
  name: "manage_user_status",
  title: "Gestionar estado de usuario (admin)",
  description:
    "Activa o bloquea una cuenta de usuario (solo admin). No permite modificar la propia cuenta. Acción sensible: la 1ª llamada devuelve una vista previa y un confirmationToken; el cambio se aplica al repetir con ese token. Registra auditoría, notifica al usuario y devuelve el estado anterior y el nuevo.",
  inputSchema: manageUserStatusInput,
  requires: "admin",
  sensitive: {
    preview: (args) => manageUserStatusPreview(args),
  },
  handler: (args, ctx) => {
    const actingUser = ctx.actingUser as ActingUser;
    return manageUserStatus(args, { id: actingUser.id, role: actingUser.role });
  },
};
