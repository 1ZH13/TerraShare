import { Hono } from "hono";

import { env } from "../config/env";
import { failure, success } from "../lib/api-response";
import { requireAuth } from "../middleware/require-auth";
import { createAuditEvent } from "../store/audit";
import { getStore } from "../store/in-memory-db";
import type { ChatMessageRecord, ChatRecord } from "../store/types";
import type { AppEnv } from "../types";

function isParticipant(chat: ChatRecord, userId: string) {
  return chat.participants.some((participant) => participant.userId === userId);
}

export const chatRoutes = new Hono<AppEnv>();

chatRoutes.get("/chats", requireAuth, (c) => {
  const authUser = c.get("authUser");
  const store = getStore();

  const chats = Array.from(store.chats.values()).filter((chat) => {
    if (authUser.role === "admin") {
      return true;
    }
    return isParticipant(chat, authUser.id);
  });

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

  const now = new Date().toISOString();
  const chat: ChatRecord = {
    id: `chat_${crypto.randomUUID()}`,
    landId: body.landId,
    rentalRequestId: body.rentalRequestId,
    participants: body.participants,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const store = getStore();
  store.chats.set(chat.id, chat);
  store.chatMessages.set(chat.id, []);

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

chatRoutes.get("/chats/:chatId/messages", requireAuth, (c) => {
  const authUser = c.get("authUser");
  const store = getStore();

  const chat = store.chats.get(c.req.param("chatId"));
  if (!chat) {
    return failure(c, 404, "NOT_FOUND", "Chat not found");
  }

  if (authUser.role !== "admin" && !isParticipant(chat, authUser.id)) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this chat");
  }

  const messages = store.chatMessages.get(chat.id) ?? [];
  return success(c, messages);
});

chatRoutes.post("/chats/:chatId/messages", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const store = getStore();
  const chat = store.chats.get(c.req.param("chatId"));

  if (!chat) {
    return failure(c, 404, "NOT_FOUND", "Chat not found");
  }

  if (authUser.role !== "admin" && !isParticipant(chat, authUser.id)) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to send messages in this chat");
  }

  const body = (await c.req.json().catch(() => null)) as { text?: string } | null;
  if (!body?.text?.trim()) {
    return failure(c, 400, "VALIDATION_ERROR", "Message text is required");
  }

  const message: ChatMessageRecord = {
    id: `msg_${crypto.randomUUID()}`,
    chatId: chat.id,
    senderId: authUser.id,
    text: body.text.trim(),
    createdAt: new Date().toISOString(),
  };

  const list = store.chatMessages.get(chat.id) ?? [];
  list.push(message);
  store.chatMessages.set(chat.id, list);

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

chatRoutes.get("/chats/:chatId/external-contact", requireAuth, (c) => {
  const authUser = c.get("authUser");
  const store = getStore();
  const chat = store.chats.get(c.req.param("chatId"));

  if (!chat) {
    return failure(c, 404, "NOT_FOUND", "Chat not found");
  }

  if (authUser.role !== "admin" && !isParticipant(chat, authUser.id)) {
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
