import { describe, expect, it } from "bun:test";
import {
  RentalRequestStatusSchema,
  RentalPeriodSchema,
  CreateRentalRequestSchema,
  UpdateRentalRequestStatusSchema,
} from "./rental-requests";

describe("RentalRequestStatusSchema", () => {
  it("parses valid statuses", () => {
    expect(RentalRequestStatusSchema.parse("draft")).toBe("draft");
    expect(RentalRequestStatusSchema.parse("pending_owner")).toBe("pending_owner");
    expect(RentalRequestStatusSchema.parse("approved")).toBe("approved");
    expect(RentalRequestStatusSchema.parse("rejected")).toBe("rejected");
    expect(RentalRequestStatusSchema.parse("cancelled")).toBe("cancelled");
    expect(RentalRequestStatusSchema.parse("pending_payment")).toBe("pending_payment");
    expect(RentalRequestStatusSchema.parse("paid")).toBe("paid");
  });

  it("rejects invalid status", () => {
    expect(() => RentalRequestStatusSchema.parse("invalid")).toThrow();
  });
});

describe("RentalPeriodSchema", () => {
  it("parses valid period", () => {
    const valid = { startDate: "2024-01-01", endDate: "2024-12-31" };
    expect(RentalPeriodSchema.parse(valid)).toEqual(valid);
  });

  it("rejects invalid start date", () => {
    const invalid = { startDate: "invalid", endDate: "2024-12-31" };
    expect(() => RentalPeriodSchema.parse(invalid)).toThrow();
  });

  it("rejects invalid end date", () => {
    const invalid = { startDate: "2024-01-01", endDate: "invalid" };
    expect(() => RentalPeriodSchema.parse(invalid)).toThrow();
  });

  it("rejects end date before start date", () => {
    const invalid = { startDate: "2024-12-31", endDate: "2024-01-01" };
    expect(() => RentalPeriodSchema.parse(invalid)).toThrow();
  });

  it("rejects same start and end date", () => {
    const invalid = { startDate: "2024-06-15", endDate: "2024-06-15" };
    expect(() => RentalPeriodSchema.parse(invalid)).toThrow();
  });
});

describe("CreateRentalRequestSchema", () => {
  it("parses valid request", () => {
    const valid = {
      landId: "land_123",
      period: { startDate: "2024-01-01", endDate: "2024-12-31" },
      intendedUse: "Agricultura",
    };
    expect(CreateRentalRequestSchema.parse(valid)).toEqual(valid);
  });

  it("parses request with notes", () => {
    const valid = {
      landId: "land_123",
      period: { startDate: "2024-01-01", endDate: "2024-12-31" },
      intendedUse: "Agricultura",
      notes: "Some notes",
    };
    expect(CreateRentalRequestSchema.parse(valid)).toEqual(valid);
  });

  it("rejects empty landId", () => {
    const invalid = {
      landId: "",
      period: { startDate: "2024-01-01", endDate: "2024-12-31" },
      intendedUse: "Agricultura",
    };
    expect(() => CreateRentalRequestSchema.parse(invalid)).toThrow();
  });

  it("rejects short intended use", () => {
    const invalid = {
      landId: "land_123",
      period: { startDate: "2024-01-01", endDate: "2024-12-31" },
      intendedUse: "AB",
    };
    expect(() => CreateRentalRequestSchema.parse(invalid)).toThrow();
  });
});

describe("UpdateRentalRequestStatusSchema", () => {
  it("parses status change to approved", () => {
    const valid = { status: "approved" };
    expect(UpdateRentalRequestStatusSchema.parse(valid)).toEqual(valid);
  });

  it("parses status change to rejected with reason", () => {
    const valid = { status: "rejected", reason: "No disponible" };
    expect(UpdateRentalRequestStatusSchema.parse(valid)).toEqual(valid);
  });

  it("parses status change to pending_payment", () => {
    const valid = { status: "pending_payment" };
    expect(UpdateRentalRequestStatusSchema.parse(valid)).toEqual(valid);
  });

  it("rejects invalid status", () => {
    const invalid = { status: "invalid" };
    expect(() => UpdateRentalRequestStatusSchema.parse(invalid)).toThrow();
  });

  it("rejects draft status in update", () => {
    const invalid = { status: "draft" };
    expect(() => UpdateRentalRequestStatusSchema.parse(invalid)).toThrow();
  });
});