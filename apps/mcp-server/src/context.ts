import { User } from "@backend/db/schemas";
import type { AuthContextUser } from "@backend/types";

/**
 * Identidad y contexto de ejecución de las tools (#234).
 *
 * Las tools que exponen o mutan datos con permisos usan los helpers `can*` del
 * backend, que requieren el usuario que actúa. En el transporte stdio, ese
 * usuario se configura vía `MCP_ACTING_USER_ID` (su `clerkUserId`): el servidor
 * MCP actúa "en nombre de" esa cuenta, y su rol/estado se resuelven desde Mongo.
 *
 * (Cuando exista el transporte remoto multi-cliente, la API key mapeará a un
 * usuario por clave; este mismo `ToolContext` seguirá siendo la interfaz que ven
 * las tools, así que no habrá que reescribirlas.)
 */

export type ActingUser = AuthContextUser;

export interface ToolContext {
  /** Usuario que actúa, o `null` si el servidor corre sin identidad (solo tools públicas). */
  actingUser: ActingUser | null;
}

/** Resuelve el usuario que actúa desde `MCP_ACTING_USER_ID`. Requiere Mongo conectada. */
export async function resolveActingUser(): Promise<ActingUser | null> {
  const clerkUserId = process.env.MCP_ACTING_USER_ID;
  if (!clerkUserId) return null;

  const user = await User.findOne({ clerkUserId }).lean();
  if (!user) return null;

  // En el modelo de auth del backend, `id` === `clerkUserId` (y `Land.ownerId`
  // apunta a ese valor), así que los helpers `can*` funcionan directamente.
  return {
    id: user.clerkUserId,
    clerkUserId: user.clerkUserId,
    email: user.email,
    role: user.role,
    status: user.status,
    profile: {
      fullName: user.profile?.fullName ?? "",
      phone: user.profile?.phone,
      province: user.profile?.province,
      marketPreference: user.profile?.marketPreference,
    },
  };
}

/** Construye el contexto de tools resolviendo la identidad configurada. */
export async function buildToolContext(): Promise<ToolContext> {
  return { actingUser: await resolveActingUser() };
}
