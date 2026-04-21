import { describe, expect, it } from "bun:test";

import { mapClerkClaimsToAuthUser } from "./clerk-user";

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
