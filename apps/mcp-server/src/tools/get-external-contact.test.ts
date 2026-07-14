import { describe, expect, it, beforeEach, afterEach } from "bun:test";

import { Chat, User } from "@backend/db/schemas";
import { getExternalContact } from "./get-external-contact";

const ownerUser = { id: "user_seed", role: "user" };
const tenantUser = { id: "user_regular", role: "user" };
const outsiderUser = { id: "user_outsider", role: "user" };

describe("get_external_contact tool (HU-84 #201)", () => {
  const originalFlag = process.env.WHATSAPP_CONTACT_ENABLED;

  beforeEach(async () => {
    await User.findOneAndUpdate(
      { clerkUserId: "user_seed" },
      { clerkUserId: "user_seed", email: "seed@test.com", role: "user", status: "active", profile: { fullName: "Seed Owner", phone: "+50761234567" } },
      { upsert: true },
    );
    await User.findOneAndUpdate(
      { clerkUserId: "user_outsider" },
      { clerkUserId: "user_outsider", email: "outsider@test.com", role: "user", status: "active", profile: { fullName: "Outsider" } },
      { upsert: true },
    );
    await Chat.deleteMany({});
    await Chat.insertMany([
      {
        id: "chat_with_phone",
        landId: "land_a",
        participants: [
          { userId: "user_seed", role: "owner" },
          { userId: "user_regular", role: "tenant" },
        ],
        status: "active",
      },
    ]);
  });

  afterEach(() => {
    process.env.WHATSAPP_CONTACT_ENABLED = originalFlag;
  });

  it("devuelve contacto cuando WhatsApp está habilitado y owner tiene teléfono", async () => {
    process.env.WHATSAPP_CONTACT_ENABLED = "true";
    const res = await getExternalContact({ chatId: "chat_with_phone" }, tenantUser);
    expect((res as { whatsappEnabled: boolean }).whatsappEnabled).toBe(true);
    const contact = (res as { contact: { phone: string; displayName: string; available: boolean } }).contact;
    expect(contact.phone).toBe("+50761234567");
    expect(contact.displayName).toBe("Seed Owner");
    expect(contact.available).toBe(true);
  });

  it("devuelve whatsappEnabled false cuando flag está deshabilitado", async () => {
    process.env.WHATSAPP_CONTACT_ENABLED = "false";
    const res = await getExternalContact({ chatId: "chat_with_phone" }, tenantUser);
    expect((res as { whatsappEnabled: boolean }).whatsappEnabled).toBe(false);
  });

  it("devuelve whatsappEnabled false cuando flag no está definido", async () => {
    delete process.env.WHATSAPP_CONTACT_ENABLED;
    const res = await getExternalContact({ chatId: "chat_with_phone" }, tenantUser);
    expect((res as { whatsappEnabled: boolean }).whatsappEnabled).toBe(false);
  });

  it("chat inexistente lanza error", async () => {
    process.env.WHATSAPP_CONTACT_ENABLED = "true";
    try {
      await getExternalContact({ chatId: "chat_nonexistent" }, tenantUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("no encontrado");
    }
  });

  it("usuario NO participante no puede ver contacto", async () => {
    process.env.WHATSAPP_CONTACT_ENABLED = "true";
    try {
      await getExternalContact({ chatId: "chat_with_phone" }, outsiderUser);
      expect(true).toBe(false);
    } catch (err) {
      expect((err as Error).message).toContain("participante");
    }
  });

  it("owner puede ver su propio contacto", async () => {
    process.env.WHATSAPP_CONTACT_ENABLED = "true";
    const res = await getExternalContact({ chatId: "chat_with_phone" }, ownerUser);
    expect((res as { whatsappEnabled: boolean }).whatsappEnabled).toBe(true);
  });
});
