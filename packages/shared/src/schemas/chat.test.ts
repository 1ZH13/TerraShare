import { describe, expect, it } from "bun:test";
import {
  ChatStatusSchema,
  ChatParticipantRoleSchema,
  ChatParticipantSchema,
  CreateChatSchema,
  CreateChatMessageSchema,
} from "./chat";

describe("ChatStatusSchema", () => {
  it("parses valid statuses", () => {
    expect(ChatStatusSchema.parse("active")).toBe("active");
    expect(ChatStatusSchema.parse("archived")).toBe("archived");
  });

  it("rejects invalid status", () => {
    expect(() => ChatStatusSchema.parse("invalid")).toThrow();
  });
});

describe("ChatParticipantRoleSchema", () => {
  it("parses valid roles", () => {
    expect(ChatParticipantRoleSchema.parse("owner")).toBe("owner");
    expect(ChatParticipantRoleSchema.parse("tenant")).toBe("tenant");
    expect(ChatParticipantRoleSchema.parse("admin")).toBe("admin");
  });

  it("rejects invalid role", () => {
    expect(() => ChatParticipantRoleSchema.parse("invalid")).toThrow();
  });
});

describe("ChatParticipantSchema", () => {
  it("parses valid participant", () => {
    const valid = { userId: "user_123", role: "owner" };
    expect(ChatParticipantSchema.parse(valid)).toEqual(valid);
  });

  it("rejects empty userId", () => {
    const invalid = { userId: "", role: "owner" };
    expect(() => ChatParticipantSchema.parse(invalid)).toThrow();
  });
});

describe("CreateChatSchema", () => {
  it("parses valid chat with participants", () => {
    const valid = {
      participants: [{ userId: "user_123", role: "owner" }],
    };
    expect(CreateChatSchema.parse(valid)).toEqual(valid);
  });

  it("parses chat with landId", () => {
    const valid = {
      landId: "land_123",
      participants: [{ userId: "user_123", role: "owner" }],
    };
    expect(CreateChatSchema.parse(valid)).toEqual(valid);
  });

  it("parses chat with rentalRequestId", () => {
    const valid = {
      rentalRequestId: "req_123",
      participants: [{ userId: "user_123", role: "tenant" }],
    };
    expect(CreateChatSchema.parse(valid)).toEqual(valid);
  });

  it("parses chat with multiple participants", () => {
    const valid = {
      landId: "land_123",
      participants: [
        { userId: "user_1", role: "owner" },
        { userId: "user_2", role: "tenant" },
      ],
    };
    expect(CreateChatSchema.parse(valid)).toEqual(valid);
  });

  it("rejects empty participants array", () => {
    const invalid = { participants: [] };
    expect(() => CreateChatSchema.parse(invalid)).toThrow();
  });
});

describe("CreateChatMessageSchema", () => {
  it("parses valid message", () => {
    const valid = { text: "Hello world" };
    expect(CreateChatMessageSchema.parse(valid)).toEqual(valid);
  });

  it("rejects empty text", () => {
    const invalid = { text: "" };
    expect(() => CreateChatMessageSchema.parse(invalid)).toThrow();
  });

  it("accepts whitespace only text", () => {
    const valid = { text: "   " };
    expect(CreateChatMessageSchema.parse(valid)).toEqual(valid);
  });
});