import { z } from "zod";

import { Chat } from "@backend/db/schemas";
import { isAdmin } from "@backend/lib/auth-helpers";
import { ToolError, type ToolDefinition } from "./define-tool";

/**
 * Tool HU-83 (#198): Listar chats. Devuelve los chats donde el usuario
 * es participante. Los administradores ven todos los chats.
 */

export const listChatsInput = {};

export async function listChats(rawInput: {
  actingUserId: string | null;
  actingUserRole?: string;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  if (!rawInput.actingUserId) {
    throw new ToolError("Se requiere un usuario autenticado");
  }

  const query: Record<string, unknown> = {};
  if (
    !isAdmin({
      id: rawInput.actingUserId,
      role: rawInput.actingUserRole ?? "user",
    } as any)
  ) {
    query["participants.userId"] = rawInput.actingUserId;
  }

  const docs = await Chat.find(query).sort({ createdAt: -1 }).lean();
  const items = (docs as unknown as Record<string, unknown>[]).map((d) => {
    const { _id, __v, ...rest } = d;
    return rest;
  });

  return { items, total: items.length };
}

/**
 * Definición de la tool. Requiere usuario autenticado.
 */
export const listChatsTool: ToolDefinition<typeof listChatsInput> = {
  name: "list_chats",
  title: "Listar chats",
  description:
    "Devuelve los chats donde el usuario es participante. Los administradores ven todos los chats.",
  inputSchema: listChatsInput,
  requires: "user",
  handler: (_args, ctx) =>
    listChats({
      actingUserId: ctx.actingUser?.id ?? null,
      actingUserRole: ctx.actingUser?.role,
    }),
};
