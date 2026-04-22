import { describe, expect, it } from "bun:test";
import { UserSummarySchema } from "./auth";

describe("auth schemas", () => {
  it("parses valid user summary", () => {
    const valid = {
      id: "user_01",
      clerkUserId: "user_01",
      email: "test@example.com",
      role: "user",
      status: "active",
      profile: { fullName: "Test User" },
    };
    expect(UserSummarySchema.parse(valid)).toEqual(valid);
  });

  it("rejects invalid email", () => {
    const invalid = {
      id: "user_01",
      clerkUserId: "user_01",
      email: "not-an-email",
      role: "user",
      status: "active",
      profile: { fullName: "Test User" },
    };
    expect(() => UserSummarySchema.parse(invalid)).toThrow();
  });

  it("rejects invalid role", () => {
    const invalid = {
      id: "user_01",
      clerkUserId: "user_01",
      email: "test@example.com",
      role: "superadmin",
      status: "active",
      profile: { fullName: "Test User" },
    };
    expect(() => UserSummarySchema.parse(invalid)).toThrow();
  });
});
