import { afterEach, describe, expect, it } from "bun:test";
import type { ClerkClient } from "@clerk/backend";

import { env } from "../config/env";
import {
  __clearClerkUserProfileCache,
  __setClerkClientForTests,
} from "./clerk-backend";
import { mapClerkClaimsToAuthUser, resolveClerkAuthUser } from "./clerk-user";

describe("mapClerkClaimsToAuthUser", () => {
  it("maps admin role from claims", () => {
    const user = mapClerkClaimsToAuthUser({
      sub: "user_123",
      email: "admin@example.com",
      full_name: "Admin User",
      role: "admin",
    });

    expect(user.clerkUserId).toBe("user_123");
    expect(user.role).toBe("admin");
    expect(user.status).toBe("active");
  });

  it("maps role and status from public metadata", () => {
    const user = mapClerkClaimsToAuthUser({
      sub: "user_456",
      email: "member@example.com",
      public_metadata: {
        role: "admin",
        status: "blocked",
        phone: "+50760000001",
      },
    });

    expect(user.role).toBe("admin");
    expect(user.status).toBe("blocked");
    expect(user.profile.phone).toBe("+50760000001");
  });

  it("falls back to default user role and derived full name", () => {
    const user = mapClerkClaimsToAuthUser({
      sub: "user_789",
      email: "fallback@example.com",
    });

    expect(user.role).toBe("user");
    expect(user.profile.fullName).toBe("fallback");
  });
});

interface FakeUserShape {
  primaryEmailAddress: { emailAddress: string } | null;
  fullName: string | null;
  primaryPhoneNumber: { phoneNumber: string } | null;
  publicMetadata?: Record<string, unknown>;
  twoFactorEnabled?: boolean;
}

function fakeClerkClient(
  user: FakeUserShape,
  counter: { calls: number },
): ClerkClient {
  return {
    users: {
      getUser: async () => {
        counter.calls += 1;
        return user;
      },
    },
  } as unknown as ClerkClient;
}

describe("resolveClerkAuthUser", () => {
  afterEach(() => {
    __setClerkClientForTests(undefined);
    __clearClerkUserProfileCache();
  });

  it("does not call Clerk when the token already has email, name and role", async () => {
    const counter = { calls: 0 };
    __setClerkClientForTests(
      fakeClerkClient(
        {
          primaryEmailAddress: { emailAddress: "should-not@use.me" },
          fullName: "Should Not Use",
          primaryPhoneNumber: null,
        },
        counter,
      ),
    );

    const user = await resolveClerkAuthUser({
      sub: "user_present",
      email: "present@example.com",
      full_name: "Present User",
      role: "user",
    });

    expect(user.email).toBe("present@example.com");
    expect(user.profile.fullName).toBe("Present User");
    expect(counter.calls).toBe(0);
  });

  it("resolves the admin role from Clerk publicMetadata when the token lacks it (#262)", async () => {
    const counter = { calls: 0 };
    __setClerkClientForTests(
      fakeClerkClient(
        {
          primaryEmailAddress: { emailAddress: "real.admin@example.com" },
          fullName: "Real Admin",
          primaryPhoneNumber: null,
          publicMetadata: { role: "admin" },
          twoFactorEnabled: true,
        },
        counter,
      ),
    );

    const user = await resolveClerkAuthUser({ sub: "user_meta_admin" });

    expect(user.role).toBe("admin");
    expect(user.mfaVerified).toBe(true);
    expect(counter.calls).toBe(1);
  });

  it("keeps a non-admin as user and reflects 2FA disabled", async () => {
    const counter = { calls: 0 };
    __setClerkClientForTests(
      fakeClerkClient(
        {
          primaryEmailAddress: { emailAddress: "plain@example.com" },
          fullName: "Plain User",
          primaryPhoneNumber: null,
          publicMetadata: {},
          twoFactorEnabled: false,
        },
        counter,
      ),
    );

    const user = await resolveClerkAuthUser({ sub: "user_plain" });

    expect(user.role).toBe("user");
    expect(user.mfaVerified).toBe(false);
  });

  it("does not let Clerk metadata override an explicit role claim", async () => {
    const counter = { calls: 0 };
    __setClerkClientForTests(
      fakeClerkClient(
        {
          primaryEmailAddress: { emailAddress: "claim@example.com" },
          fullName: "Claim User",
          primaryPhoneNumber: null,
          publicMetadata: { role: "admin" },
        },
        counter,
      ),
    );

    const user = await resolveClerkAuthUser({
      sub: "user_claim",
      email: "claim@example.com",
      full_name: "Claim User",
      role: "user",
    });

    expect(user.role).toBe("user");
    expect(counter.calls).toBe(0);
  });

  it("enriches email/name/phone from Clerk when the token lacks them", async () => {
    const counter = { calls: 0 };
    __setClerkClientForTests(
      fakeClerkClient(
        {
          primaryEmailAddress: { emailAddress: "Real@Example.com" },
          fullName: "Real Person",
          primaryPhoneNumber: { phoneNumber: "+50761234567" },
        },
        counter,
      ),
    );

    const user = await resolveClerkAuthUser({ sub: "user_missing" });

    expect(user.email).toBe("real@example.com");
    expect(user.profile.fullName).toBe("Real Person");
    expect(user.profile.phone).toBe("+50761234567");
    expect(counter.calls).toBe(1);
  });

  it("promotes to admin when the enriched email matches the seed", async () => {
    const counter = { calls: 0 };
    __setClerkClientForTests(
      fakeClerkClient(
        {
          primaryEmailAddress: { emailAddress: env.adminSeedEmail },
          fullName: "Seed Admin",
          primaryPhoneNumber: null,
        },
        counter,
      ),
    );

    const user = await resolveClerkAuthUser({ sub: "user_seed_admin" });

    expect(user.email).toBe(env.adminSeedEmail);
    expect(user.role).toBe("admin");
  });

  it("degrades to fallbacks when Clerk is not configured", async () => {
    // Sin cliente inyectado ni CLERK_SECRET_KEY: no hay enriquecimiento.
    const user = await resolveClerkAuthUser({ sub: "user_no_clerk" });

    expect(user.email).toBe("unknown@terrashare.local");
    expect(user.profile.fullName).toBe("Usuario");
  });
});
