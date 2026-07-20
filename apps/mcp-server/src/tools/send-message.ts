import { z } from "zod";

import { Chat, ChatMessage, AuditEvent } from "@backend/db/schemas";
import { ToolError, type ToolDefinition } from "./define-tool";
import { canReadChat } from "../permissions";

const sendMessageInput = {
  chatId: z.string().min(1).describe("ID del chat"),
  text: z.string().min(1).describe("Contenido del mensaje"),
};

export type SendMessageInput = z.infer<z.ZodObject<typeof sendMessageInput>>;

export async function sendMessage(
  rawInput: unknown,
  actingUser: { id: string; role: string },
): Promise<Record<string, unknown>> {
  const schema = z.object(sendMessageInput);
  const input = schema.parse(rawInput ?? {});

  const trimmedText = input.text.trim();
  if (trimmedText.length === 0) throw new ToolError("El mensaje no puede estar vacío");

  const chat = await Chat.findOne({ id: input.chatId }).lean();
  if (!chat) throw new ToolError("Chat no encontrado");

  if (!canReadChat(actingUser as never, { participants: chat.participants } as never)) {
    throw new ToolError("No eres participante de este chat");
  }

  const messageId = `msg_${crypto.randomUUID()}`;
  const now = new Date();

  await ChatMessage.create({
    id: messageId,
    chatId: input.chatId,
    senderId: actingUser.id,
    text: trimmedText,
    // Marca de transparencia (#328): enviado a través del asistente/agente.
    viaAssistant: true,
    createdAt: now,
  });

  await AuditEvent.create({
    id: `audit_${crypto.randomUUID()}`,
    actorId: actingUser.id,
    actorRole: actingUser.role as "user" | "admin",
    entity: "chat",
    action: "updated",
    entityId: input.chatId,
    metadata: { messageId },
  });

  return {
    messageId,
    chatId: input.chatId,
    senderId: actingUser.id,
    text: trimmedText,
    viaAssistant: true,
    createdAt: now.toISOString(),
  };
}

export const sendMessageTool: ToolDefinition<typeof sendMessageInput> = {
  name: "send_message",
  title: "Enviar mensaje",
  description:
    "Envía un mensaje de texto en un chat existente. El usuario debe ser participante del chat. Acción sensible: requiere confirm: true. El mensaje se marca como enviado vía asistente (transparencia).",
  inputSchema: sendMessageInput,
  requires: "user",
  // Capa A (#328): confirmación explícita. El mensaje queda marcado `viaAssistant`.
  sensitive: { confirm: true },
  handler: async (args, ctx) => {
    const actingUser = ctx.actingUser!;
    return sendMessage(args, actingUser);
  },
};
