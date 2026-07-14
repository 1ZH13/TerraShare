import { z } from "zod";

import { Chat, User } from "@backend/db/schemas";
import { ToolError, type ToolDefinition } from "./define-tool";
import { canReadChat } from "../permissions";

const getExternalContactInput = {
  chatId: z.string().min(1).describe("ID del chat"),
};

export type GetExternalContactInput = z.infer<z.ZodObject<typeof getExternalContactInput>>;

export async function getExternalContact(
  rawInput: unknown,
  actingUser: { id: string; role: string },
): Promise<Record<string, unknown>> {
  const schema = z.object(getExternalContactInput);
  const input = schema.parse(rawInput ?? {});

  const chat = await Chat.findOne({ id: input.chatId }).lean();
  if (!chat) throw new ToolError("Chat no encontrado");

  if (!canReadChat(actingUser as never, { participants: chat.participants } as never)) {
    throw new ToolError("No eres participante de este chat");
  }

  if (process.env.WHATSAPP_CONTACT_ENABLED !== "true") {
    return { whatsappEnabled: false };
  }

  const ownerParticipant = chat.participants.find((p) => p.role === "owner");
  if (!ownerParticipant) {
    throw new ToolError("No se encontró el propietario en este chat");
  }

  const owner = await User.findOne({ clerkUserId: ownerParticipant.userId }).lean();
  if (!owner) {
    throw new ToolError("Usuario propietario no encontrado");
  }

  const phone = owner.profile?.phone ?? null;
  const displayName = owner.profile?.fullName ?? "Propietario";

  return {
    whatsappEnabled: true,
    contact: {
      phone,
      displayName,
      available: Boolean(phone),
    },
  };
}

export const getExternalContactTool: ToolDefinition<typeof getExternalContactInput> = {
  name: "get_external_contact",
  title: "Obtener contacto externo",
  description:
    "Obtiene el contacto externo (WhatsApp) del propietario en un chat. Requiere que la funcionalidad de WhatsApp esté habilitada.",
  inputSchema: getExternalContactInput,
  requires: "user",
  handler: async (args, ctx) => {
    const actingUser = ctx.actingUser!;
    return getExternalContact(args, actingUser);
  },
};
