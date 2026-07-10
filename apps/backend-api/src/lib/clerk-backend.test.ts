import { afterEach, describe, expect, it } from "bun:test";
import type { ClerkClient } from "@clerk/backend";

import {
  __clearClerkUserProfileCache,
  __setClerkClientForTests,
  getClerkUserProfile,
} from "./clerk-backend";

interface FakeUserShape {
  primaryEmailAddress: { emailAddress: string } | null;
  fullName: string | null;
  primaryPhoneNumber: { phoneNumber: string } | null;
  publicMetadata?: Record<string, unknown>;
  twoFactorEnabled?: boolean;
}

function makeFakeClient(
  user: FakeUserShape | Error,
  counter: { calls: number },
): ClerkClient {
  return {
    users: {
      getUser: async (_userId: string) => {
        counter.calls += 1;
        if (user instanceof Error) {
          throw user;
        }
        return user;
      },
    },
  } as unknown as ClerkClient;
}

afterEach(() => {
  __setClerkClientForTests(undefined);
  __clearClerkUserProfileCache();
});

describe("getClerkUserProfile", () => {
  it("returns null when Clerk is not configured", async () => {
    // Sin cliente inyectado y sin CLERK_SECRET_KEY en el entorno de test.
    const profile = await getClerkUserProfile("user_none");
    expect(profile).toBeNull();
  });

  it("maps the Clerk user resource to a flat profile", async () => {
    const counter = { calls: 0 };
    __setClerkClientForTests(
      makeFakeClient(
        {
          primaryEmailAddress: { emailAddress: "real@example.com" },
          fullName: "Real Person",
          primaryPhoneNumber: { phoneNumber: "+50761234567" },
        },
        counter,
      ),
    );

    const profile = await getClerkUserProfile("user_1");
    expect(profile).toEqual({
      email: "real@example.com",
      fullName: "Real Person",
      phone: "+50761234567",
      role: undefined,
      twoFactorEnabled: false,
    });
  });

  it("maps role from publicMetadata and the 2FA flag (#262)", async () => {
    const counter = { calls: 0 };
    __setClerkClientForTests(
      makeFakeClient(
        {
          primaryEmailAddress: { emailAddress: "admin@example.com" },
          fullName: "Admin Person",
          primaryPhoneNumber: null,
          publicMetadata: { role: "admin" },
          twoFactorEnabled: true,
        },
        counter,
      ),
    );

    const profile = await getClerkUserProfile("user_admin");
    expect(profile?.role).toBe("admin");
    expect(profile?.twoFactorEnabled).toBe(true);
  });

  it("caches the result and does not hit Clerk twice", async () => {
    const counter = { calls: 0 };
    __setClerkClientForTests(
      makeFakeClient(
        {
          primaryEmailAddress: { emailAddress: "cache@example.com" },
          fullName: "Cached User",
          primaryPhoneNumber: null,
        },
        counter,
      ),
    );

    await getClerkUserProfile("user_2");
    await getClerkUserProfile("user_2");
    expect(counter.calls).toBe(1);
  });

  it("returns null and does not cache when the fetch fails", async () => {
    const counter = { calls: 0 };
    __setClerkClientForTests(makeFakeClient(new Error("boom"), counter));

    const first = await getClerkUserProfile("user_3");
    const second = await getClerkUserProfile("user_3");

    expect(first).toBeNull();
    expect(second).toBeNull();
    // Los fallos no se cachean: se reintenta en la siguiente llamada.
    expect(counter.calls).toBe(2);
  });
});
