import { afterEach, describe, expect, it } from "bun:test";

import { ensureUserInMongo, upsertAuthUser, __resetMongoUserSync } from "./require-auth";
import { getStore } from "../store/in-memory-db";
import { User } from "../db/schemas";
import type { AuthContextUser } from "../types";

function makeUser(id: string): AuthContextUser {
  return {
    id,
    clerkUserId: id,
    email: `${id}@example.com`,
    role: "user",
    status: "active",
    profile: { fullName: "Test User", phone: "+50760000000" },
  };
}

describe("ensureUserInMongo (#137 D-4)", () => {
  afterEach(() => {
    __resetMongoUserSync();
  });

  it("upserts the authenticated user into the Mongo users collection", async () => {
    await ensureUserInMongo(makeUser("user_clerk_real"));

    const doc = await User.findOne({ clerkUserId: "user_clerk_real" }).lean();
    expect(doc).not.toBeNull();
    expect(doc?.email).toBe("user_clerk_real@example.com");
    expect(doc?.profile.fullName).toBe("Test User");
  });

  it("is idempotent: a second call does not duplicate the user", async () => {
    await ensureUserInMongo(makeUser("user_dupe"));
    __resetMongoUserSync(); // fuerza reintento de escritura, no cache
    await ensureUserInMongo(makeUser("user_dupe"));

    const count = await User.countDocuments({ clerkUserId: "user_dupe" });
    expect(count).toBe(1);
  });

  it("does not overwrite onboarding data on later logins ($setOnInsert)", async () => {
    // El usuario ya existe con datos de onboarding (provincia/preferencia).
    await User.create({
      clerkUserId: "user_onb",
      email: "user_onb@example.com",
      role: "user",
      status: "active",
      profile: { fullName: "Onb User", province: "Chiriquí", marketPreference: "ofrezco" },
    });

    await ensureUserInMongo(makeUser("user_onb"));

    const doc = await User.findOne({ clerkUserId: "user_onb" }).lean();
    expect(doc?.profile.province).toBe("Chiriquí");
    expect(doc?.profile.marketPreference).toBe("ofrezco");
  });
});

describe("upsertAuthUser (#426)", () => {
  it("does not let an undefined claim overwrite a saved profile field", () => {
    const store = getStore();
    // El usuario guardó su teléfono/provincia/preferencia vía onboarding.
    store.users.set("user_phone_keep", {
      id: "user_phone_keep",
      clerkUserId: "user_phone_keep",
      email: "user_phone_keep@example.com",
      role: "user",
      status: "active",
      profile: {
        fullName: "Con Teléfono",
        phone: "+50761234567",
        province: "Veraguas",
        marketPreference: "ofrezco",
      },
    } as AuthContextUser);

    // Petición siguiente: el token de Clerk no trae esos campos → `undefined`.
    const fromClaims: AuthContextUser = {
      id: "user_phone_keep",
      clerkUserId: "user_phone_keep",
      email: "user_phone_keep@example.com",
      role: "user",
      status: "active",
      profile: { fullName: "Con Teléfono", phone: undefined },
    };

    const merged = upsertAuthUser(fromClaims);

    // Lo guardado sobrevive: sin el filtro de `undefined` quedaría en blanco.
    expect(merged.profile.phone).toBe("+50761234567");
    expect(merged.profile.province).toBe("Veraguas");
    expect(merged.profile.marketPreference).toBe("ofrezco");
  });

  it("still lets a present claim update the stored value", () => {
    const store = getStore();
    store.users.set("user_name_update", {
      id: "user_name_update",
      clerkUserId: "user_name_update",
      email: "user_name_update@example.com",
      role: "user",
      status: "active",
      profile: { fullName: "Nombre Viejo", phone: "+50760000000" },
    } as AuthContextUser);

    const merged = upsertAuthUser({
      id: "user_name_update",
      clerkUserId: "user_name_update",
      email: "user_name_update@example.com",
      role: "user",
      status: "active",
      profile: { fullName: "Nombre Nuevo", phone: undefined },
    });

    expect(merged.profile.fullName).toBe("Nombre Nuevo"); // el claim presente gana
    expect(merged.profile.phone).toBe("+50760000000"); // el ausente no borra
  });
});
