import { describe, expect, it } from "bun:test";
import { getChatMessages } from "./get-chat-messages";

describe("get_chat_messages tool (HU-84 #199)", () => {
  it("devuelve mensajes de un chat existente", async () => {
    const result = await getChatMessages({
      chatId: "chat_seed_01",
      actingUserId: "user_seed",
      actingUserRole: "user",
    });
    const messages = (result as { items: unknown[] }).items;
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);
  });

  it("permite a un administrador ver mensajes de cualquier chat", async () => {
    const result = await getChatMessages({
      chatId: "chat_seed_01",
      actingUserId: "user_admin",
      actingUserRole: "admin",
    });
    const messages = (result as { items: unknown[] }).items;
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);
  });

  it("lanza error cuando el chat no existe", async () => {
    await expect(
      getChatMessages({
        chatId: "nonexistent",
        actingUserId: "user_seed",
        actingUserRole: "user",
      })
    ).rejects.toThrow("Chat no encontrado");
  });

  it("lanza error cuando el usuario no es participante", async () => {
    await expect(
      getChatMessages({
        chatId: "chat_seed_01",
        actingUserId: "user_other",
        actingUserRole: "user",
      })
    ).rejects.toThrow("No autorizado");
  });

  it("lanza error cuando no hay usuario autenticado", async () => {
    await expect(
      getChatMessages({
        chatId: "chat_seed_01",
        actingUserId: null,
        actingUserRole: "user",
      })
    ).rejects.toThrow("Se requiere un usuario autenticado");
  });

  it("no expone campos internos de Mongo", async () => {
    const result = await getChatMessages({
      chatId: "chat_seed_01",
      actingUserId: "user_seed",
      actingUserRole: "user",
    });
    const messages = (result as { items: Record<string, unknown>[] }).items;
    expect(messages.every((m) => !("_id" in m) && !("__v" in m))).toBe(true);
  });

  it("ordena mensajes por fecha de creación ascendente", async () => {
    const result = await getChatMessages({
      chatId: "chat_seed_01",
      actingUserId: "user_seed",
      actingUserRole: "user",
    });
    const messages = (result as { items: { createdAt: string }[] }).items;
    expect(messages.length).toBeGreaterThan(1);
    expect(new Date(messages[0].createdAt).getTime()).toBeLessThanOrEqual(
      new Date(messages[1].createdAt).getTime()
    );
  });

  it("incluye campos relevantes en cada mensaje", async () => {
    const result = await getChatMessages({
      chatId: "chat_seed_01",
      actingUserId: "user_seed",
      actingUserRole: "user",
    });
    const messages = (result as { items: Record<string, unknown>[] }).items;
    expect(messages.length).toBeGreaterThan(0);
    const msg = messages[0];
    expect(msg).toHaveProperty("id");
    expect(msg).toHaveProperty("chatId");
    expect(msg).toHaveProperty("senderId");
    expect(msg).toHaveProperty("text");
    expect(msg).toHaveProperty("createdAt");
  });
});
