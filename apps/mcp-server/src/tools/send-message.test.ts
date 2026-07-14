import { describe, expect, it, beforeEach } from "bun:test";

import { Chat, ChatMessage, User } from "@backend/db/schemas";
import { sendMessage } from "./send-message";

const ownerUser = { id: "user_seed", role: "user" };
const tenantUser = { id: "user_regular", role: "user" };
const outsiderUser = { id: "user_outsider", role: "user" };

describe("send_message tool (HU-83 #200)", () => {
  beforeEach(async () => {
    await User.findOneAndUpdate(
      { clerkUserId: "user_seed" },
      { clerkUserId: "user_seed", email: "seed@test.com", role: "user", status: "active", profile: { fullName: "Seed Owner" } },
      { upsert: true },
    );
    await User.findOneAndUpdate(
      { clerkUserId: "user_outsider" },
      { clerkUserId: "user_outsider", email: "outsider@test.com", role: "user", status: "active", profile: { fullName: "Outsider" } },
      { upsert: true },
    );
    await ChatMessage.deleteMany({});
    await Chat.deleteMany({});
    await Chat.insertMany([
      {
        id: "chat_1",
        landId: "land_a",
        participants: [
          { userId: "user_seed", role: "owner" },
          { userId: "user_regular", role: "tenant" },
        ],
        status: "active",
      },
    ]);
  });

  it("participante envía mensaje exitosamente", async () => {
    const res = await sendMessage({ chatId: "chat_1", text: "Hola!" }, ownerUser);
    expect((res as { text: string }).text).toBe("Hola!");
    expect((res as { senderId: string }).senderId).toBe("user_seed");
    expect((res as { chatId: string }).chatId).toBe("chat_1");
    expect((res as { messageId: string }).messageId).toMatch(/^msg_/);
  });

  it("texto con espacios se trimea", async () => {
    const res = await sendMessage({ chatId: "chat_1", text: "  Mensaje con espacios  " }, ownerUser);
    expect((res as { text: string }).text).toBe("Mensaje con espacios");
  });

  it("texto vacío lanza error", async () => {
    try {
      await sendMessage({ chatId: "chat_1", text: "   " }, ownerUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("vacío");
    }
  });

  it("chat inexistente lanza error", async () => {
    try {
      await sendMessage({ chatId: "chat_nonexistent", text: "Hola" }, ownerUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("no encontrado");
    }
  });

  it("usuario NO participante no puede enviar", async () => {
    try {
      await sendMessage({ chatId: "chat_1", text: "Hola" }, outsiderUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("participante");
    }
  });

  it("ambos participantes pueden enviar", async () => {
    const res1 = await sendMessage({ chatId: "chat_1", text: "Owner msg" }, ownerUser);
    expect((res1 as { senderId: string }).senderId).toBe("user_seed");
    const res2 = await sendMessage({ chatId: "chat_1", text: "Tenant msg" }, tenantUser);
    expect((res2 as { senderId: string }).senderId).toBe("user_regular");
  });
});
