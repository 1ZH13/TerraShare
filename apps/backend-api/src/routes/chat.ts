import { Hono } from "hono";

import { env } from "../config/env";
import { failure, success } from "../lib/api-response";
import { canReadChat } from "../lib/auth-helpers";
import { requireAuth } from "../middleware/require-auth";
import { createAuditEvent } from "../store/audit";
import { getStore } from "../store/in-memory-db";
import { Chat, ChatMessage, Land, User } from "../db/schemas";
import type { AppEnv } from "../types";

function isParticipant(chat: { participants: { userId: string }[] }, userId: string) {
  return chat.participants.some((participant) => participant.userId === userId);
}

const ROLE_FALLBACK: Record<string, string> = {
  owner: "Propietario",
  tenant: "Interesado",
  admin: "Administrador",
};

/** Resuelve el nombre visible de un usuario desde el store en memoria o Mongo. */
async function resolveDisplayName(userId: string, role: string): Promise<string> {
  const store = getStore();
  const inMemory = store.users.get(userId);
  if (inMemory?.profile?.fullName) return inMemory.profile.fullName;
  const inMongo = await User.findOne({ clerkUserId: userId }).lean();
  return inMongo?.profile?.fullName ?? ROLE_FALLBACK[role] ?? "Usuario";
}

export const chatRoutes = new Hono<AppEnv>();

chatRoutes.get("/chats", requireAuth, async (c) => {
  const authUser = c.get("authUser");

  const query = authUser.role === "admin"
    ? {}
    : { "participants.userId": authUser.id };

  const chats = await Chat.find(query).lean();
  const store = getStore();

  // Enriquecimiento para la bandeja (#149): interlocutor, terreno y último mensaje.
  const enriched = await Promise.all(
    chats.map(async (chat) => {
      const other =
        chat.participants.find((p) => p.userId !== authUser.id) ?? chat.participants[0];

      const [displayName, lastMsg] = await Promise.all([
        other ? resolveDisplayName(other.userId, other.role) : Promise.resolve("Usuario"),
        ChatMessage.find({ chatId: chat.id }).sort({ createdAt: -1 }).limit(1).lean(),
      ]);

      let landTitle: string | undefined;
      if (chat.landId) {
        const landInMemory = store.lands.get(chat.landId);
        landTitle = landInMemory?.title ?? (await Land.findOne({ id: chat.landId }).lean())?.title;
      }

      const last = lastMsg[0];
      return {
        ...chat,
        otherParticipant: other
          ? { userId: other.userId, role: other.role, displayName }
          : undefined,
        landTitle,
        lastMessage: last
          ? { text: last.text, senderId: last.senderId, createdAt: last.createdAt }
          : undefined,
        unread: Boolean(last && last.senderId !== authUser.id),
      };
    }),
  );

  return success(c, enriched);
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

  if (!canReadChat(authUser, chat)) {
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

  if (!canReadChat(authUser, chat)) {
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

  if (!canReadChat(authUser, chat)) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to view external contact for this chat");
  }

  if (!env.whatsappContactEnabled) {
    return success(c, { whatsappEnabled: false });
  }

  const ownerParticipant = chat.participants.find((participant) => participant.role === "owner");
  const ownerId = ownerParticipant?.userId;

  // Resolve the owner's real contact details from the in-memory store (dev /
  // runtime cache) or Mongo, instead of a hardcoded placeholder.
  const store = getStore();
  const ownerInMemory = ownerId ? store.users.get(ownerId) : undefined;
  const ownerInMongo = ownerId ? await User.findOne({ clerkUserId: ownerId }).lean() : null;
  const phone = ownerInMemory?.profile?.phone ?? ownerInMongo?.profile?.phone ?? null;
  const displayName =
    ownerInMemory?.profile?.fullName ?? ownerInMongo?.profile?.fullName ?? ownerId ?? "Propietario";

  return success(c, {
    whatsappEnabled: true,
    contact: {
      phone,
      displayName,
      available: Boolean(phone),
    },
  });
});
