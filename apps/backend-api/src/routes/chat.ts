import { Hono } from "hono";

import { env } from "../config/env";
import { failure, success } from "../lib/api-response";
import { requireAuth } from "../middleware/require-auth";
import { createAuditEvent } from "../store/audit";
import { Chat, ChatMessage } from "../db/schemas";
import type { AppEnv } from "../types";

function isParticipant(chat: { participants: { userId: string }[] }, userId: string) {
  return chat.participants.some((participant) => participant.userId === userId);
}

export const chatRoutes = new Hono<AppEnv>();

chatRoutes.get("/chats", requireAuth, async (c) => {
  const authUser = c.get("authUser");

  const query = authUser.role === "admin"
    ? {}
    : { "participants.userId": authUser.id };

  const chats = await Chat.find(query).lean();
  return success(c, chats);
});

chatRoutes.post("/chats", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const body = (await c.req.json().catch(() => null)) as
    | {
        landId?: string;
        rentalRequestId?: string;
        participants?: { userId: string; role: "owner" | "tenant" | "admin" }[];
      }
    | null;

  if (!body?.participants?.length) {
    return failure(c, 400, "VALIDATION_ERROR", "Participants are required");
  }

  if (!body.participants.some((participant) => participant.userId === authUser.id)) {
    return failure(c, 403, "FORBIDDEN", "Current user must be part of chat participants");
  }

  const chat = await Chat.create({
    id: `chat_${crypto.randomUUID()}`,
    landId: body.landId,
    rentalRequestId: body.rentalRequestId,
    participants: body.participants,
    status: "active",
  });

  createAuditEvent({
    actor: authUser,
    entity: "chat",
    action: "created",
    entityId: chat.id,
    metadata: {
      participants: chat.participants,
      landId: chat.landId,
      rentalRequestId: chat.rentalRequestId,
    },
  });

  return success(c, chat, 201);
});

chatRoutes.get("/chats/:chatId/messages", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const chatId = c.req.param("chatId");

  const chat = await Chat.findOne({ id: chatId }).lean();
  if (!chat) {
    return failure(c, 404, "NOT_FOUND", "Chat not found");
  }

  if (authUser.role !== "admin" && !isParticipant(chat as any, authUser.id)) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this chat");
  }

  const messages = await ChatMessage.find({ chatId: chat.id }).sort({ createdAt: 1 }).lean();
  return success(c, messages);
});

chatRoutes.post("/chats/:chatId/messages", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const chatId = c.req.param("chatId");

  const chat = await Chat.findOne({ id: chatId }).lean();
  if (!chat) {
    return failure(c, 404, "NOT_FOUND", "Chat not found");
  }

  if (authUser.role !== "admin" && !isParticipant(chat as any, authUser.id)) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to send messages in this chat");
  }

  const body = (await c.req.json().catch(() => null)) as { text?: string } | null;
  if (!body?.text?.trim()) {
    return failure(c, 400, "VALIDATION_ERROR", "Message text is required");
  }

  const message = await ChatMessage.create({
    id: `msg_${crypto.randomUUID()}`,
    chatId: chat.id,
    senderId: authUser.id,
    text: body.text.trim(),
  });

  createAuditEvent({
    actor: authUser,
    entity: "chat",
    action: "updated",
    entityId: chat.id,
    metadata: {
      messageId: message.id,
    },
  });

  return success(c, message, 201);
});

chatRoutes.get("/chats/:chatId/external-contact", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const chatId = c.req.param("chatId");

  const chat = await Chat.findOne({ id: chatId }).lean();
  if (!chat) {
    return failure(c, 404, "NOT_FOUND", "Chat not found");
  }

  if (authUser.role !== "admin" && !isParticipant(chat as any, authUser.id)) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to view external contact for this chat");
  }

  if (!env.whatsappContactEnabled) {
    return success(c, { whatsappEnabled: false });
  }

  const ownerParticipant = chat.participants.find((participant) => participant.role === "owner");

  return success(c, {
    whatsappEnabled: true,
    contact: {
      phone: "+50760000000",
      displayName: ownerParticipant?.userId ?? "Propietario",
    },
  });
});
