import { describe, expect, it } from "bun:test";
import { AuditEventFilterSchema } from "./audit";

describe("AuditEventFilterSchema", () => {
  it("parses empty filter", () => {
    expect(AuditEventFilterSchema.parse({})).toEqual({});
  });

  it("parses filter with actorId", () => {
    const filter = { actorId: "user_123" };
    expect(AuditEventFilterSchema.parse(filter)).toEqual(filter);
  });

  it("parses filter with entity", () => {
    const filter = { entity: "land" };
    expect(AuditEventFilterSchema.parse(filter)).toEqual(filter);
  });

  it("parses filter with action", () => {
    const filter = { action: "created" };
    expect(AuditEventFilterSchema.parse(filter)).toEqual(filter);
  });

  it("parses filter with entityId", () => {
    const filter = { entityId: "land_123" };
    expect(AuditEventFilterSchema.parse(filter)).toEqual(filter);
  });

  it("parses filter with date range", () => {
    const filter = { from: "2024-01-01", to: "2024-12-31" };
    expect(AuditEventFilterSchema.parse(filter)).toEqual(filter);
  });

  it("parses filter with all fields", () => {
    const filter = {
      actorId: "user_123",
      entity: "land",
      action: "created",
      entityId: "land_456",
      from: "2024-01-01",
      to: "2024-12-31",
    };
    expect(AuditEventFilterSchema.parse(filter)).toEqual(filter);
  });

  it("parses all valid entities", () => {
    expect(AuditEventFilterSchema.parse({ entity: "auth" })).toEqual({ entity: "auth" });
    expect(AuditEventFilterSchema.parse({ entity: "user" })).toEqual({ entity: "user" });
    expect(AuditEventFilterSchema.parse({ entity: "land" })).toEqual({ entity: "land" });
    expect(AuditEventFilterSchema.parse({ entity: "rental_request" })).toEqual({ entity: "rental_request" });
    expect(AuditEventFilterSchema.parse({ entity: "contract" })).toEqual({ entity: "contract" });
    expect(AuditEventFilterSchema.parse({ entity: "payment" })).toEqual({ entity: "payment" });
    expect(AuditEventFilterSchema.parse({ entity: "chat" })).toEqual({ entity: "chat" });
  });

  it("parses all valid actions", () => {
    expect(AuditEventFilterSchema.parse({ action: "created" })).toEqual({ action: "created" });
    expect(AuditEventFilterSchema.parse({ action: "updated" })).toEqual({ action: "updated" });
    expect(AuditEventFilterSchema.parse({ action: "deleted" })).toEqual({ action: "deleted" });
    expect(AuditEventFilterSchema.parse({ action: "approved" })).toEqual({ action: "approved" });
    expect(AuditEventFilterSchema.parse({ action: "rejected" })).toEqual({ action: "rejected" });
    expect(AuditEventFilterSchema.parse({ action: "cancelled" })).toEqual({ action: "cancelled" });
    expect(AuditEventFilterSchema.parse({ action: "paid" })).toEqual({ action: "paid" });
    expect(AuditEventFilterSchema.parse({ action: "status_changed" })).toEqual({ action: "status_changed" });
  });

  it("rejects invalid entity", () => {
    const filter = { entity: "invalid" };
    expect(() => AuditEventFilterSchema.parse(filter)).toThrow();
  });

  it("rejects invalid action", () => {
    const filter = { action: "invalid" };
    expect(() => AuditEventFilterSchema.parse(filter)).toThrow();
  });
});