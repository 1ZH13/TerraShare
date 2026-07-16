import { describe, expect, it } from "bun:test";

import { listChats } from "./list-chats";

describe("list_chats tool (HU-83 #198)", () => {
  it("devuelve chats donde el usuario es participante", async () => {
    const result = await listChats({
      actingUserId: "user_seed",
      actingUserRole: "user",
    });
    const chats = (result as { items: unknown[] }).items;
    expect(Array.isArray(chats)).toBe(true);
    expect(chats.length).toBeGreaterThan(0);
  });

  it("devuelve todos los chats para un administrador", async () => {
    const result = await listChats({
      actingUserId: "user_admin",
      actingUserRole: "admin",
    });
    const chats = (result as { items: unknown[] }).items;
    expect(Array.isArray(chats)).toBe(true);
    expect(chats.length).toBeGreaterThan(0);
  });

  it("devuelve array vacío si el usuario no tiene chats", async () => {
    const result = await listChats({
      actingUserId: "user_no_chats",
      actingUserRole: "user",
    });
    const chats = (result as { items: unknown[] }).items;
    expect(chats.length).toBe(0);
  });

  it("no expone campos internos de Mongo", async () => {
    const result = await listChats({
      actingUserId: "user_seed",
      actingUserRole: "user",
    });
    const chats = (result as { items: Record<string, unknown>[] }).items;
    expect(chats.every((c) => !("_id" in c) && !("__v" in c))).toBe(true);
  });

  it("lanza error cuando no hay usuario autenticado", async () => {
    await expect(
      listChats({ actingUserId: null, actingUserRole: "user" })
    ).rejects.toThrow("Se requiere un usuario autenticado");
  });

  it("incluye campos relevantes en cada chat", async () => {
    const result = await listChats({
      actingUserId: "user_seed",
      actingUserRole: "user",
    });
    const chats = (result as { items: Record<string, unknown>[] }).items;
    expect(chats.length).toBeGreaterThan(0);
    const chat = chats[0];
    expect(chat).toHaveProperty("id");
    expect(chat).toHaveProperty("participants");
    expect(chat).toHaveProperty("status");
    expect(chat).toHaveProperty("createdAt");
  });
});
