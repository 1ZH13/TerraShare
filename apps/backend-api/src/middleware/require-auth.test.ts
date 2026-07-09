import { afterEach, describe, expect, it } from "bun:test";

import { ensureUserInMongo, __resetMongoUserSync } from "./require-auth";
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
