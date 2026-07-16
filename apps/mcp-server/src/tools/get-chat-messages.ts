import { z } from "zod";

import { Chat, ChatMessage } from "@backend/db/schemas";
import { canReadChat } from "@backend/lib/auth-helpers";
import { ToolError, type ToolDefinition } from "./define-tool";

export const getChatMessagesInput = {
  chatId: z.string().min(1).describe("ID del chat"),
};

export async function getChatMessages(rawInput: {
  chatId: string;
  actingUserId: string | null;
  actingUserRole?: string;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  if (!rawInput.actingUserId) {
    throw new ToolError("Se requiere un usuario autenticado");
  }

  const chat = await Chat.findOne({ id: rawInput.chatId }).lean();
  if (!chat) throw new ToolError("Chat no encontrado");

  if (
    !canReadChat(
      { id: rawInput.actingUserId, role: rawInput.actingUserRole ?? "user" } as any,
      chat as any
    )
  ) {
    throw new ToolError("No autorizado para ver este chat");
  }

  const docs = await ChatMessage.find({ chatId: rawInput.chatId })
    .sort({ createdAt: 1 })
    .lean();
  const items = (docs as unknown as Record<string, unknown>[]).map((d) => {
    const { _id, __v, ...rest } = d;
    return rest;
  });

  return { items, total: items.length };
}

export const getChatMessagesTool: ToolDefinition<typeof getChatMessagesInput> = {
  name: "get_chat_messages",
  title: "Obtener mensajes de chat",
  description:
    "Devuelve los mensajes de un chat ordenados por fecha. Solo los participantes o un administrador pueden verlos.",
  inputSchema: getChatMessagesInput,
  requires: "user",
  handler: (args, ctx) =>
    getChatMessages({
      chatId: args.chatId as string,
      actingUserId: ctx.actingUser?.id ?? null,
      actingUserRole: ctx.actingUser?.role,
    }),
};
