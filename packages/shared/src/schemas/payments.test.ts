import { describe, expect, it } from "bun:test";
import {
  PaymentStatusSchema,
  CreateCheckoutSessionSchema,
  PaymentListFilterSchema,
} from "./payments";

describe("PaymentStatusSchema", () => {
  it("parses valid statuses", () => {
    expect(PaymentStatusSchema.parse("pending")).toBe("pending");
    expect(PaymentStatusSchema.parse("processing")).toBe("processing");
    expect(PaymentStatusSchema.parse("paid")).toBe("paid");
    expect(PaymentStatusSchema.parse("failed")).toBe("failed");
    expect(PaymentStatusSchema.parse("cancelled")).toBe("cancelled");
  });

  it("rejects invalid status", () => {
    expect(() => PaymentStatusSchema.parse("invalid")).toThrow();
  });
});

describe("CreateCheckoutSessionSchema", () => {
  it("parses valid session", () => {
    const valid = {
      rentalRequestId: "req_123",
      currency: "USD",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    };
    expect(CreateCheckoutSessionSchema.parse(valid)).toEqual(valid);
  });

  it("parses session with PAB currency", () => {
    const valid = {
      rentalRequestId: "req_123",
      currency: "PAB",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    };
    expect(CreateCheckoutSessionSchema.parse(valid)).toEqual(valid);
  });

  it("rejects empty rentalRequestId", () => {
    const invalid = {
      rentalRequestId: "",
      currency: "USD",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    };
    expect(() => CreateCheckoutSessionSchema.parse(invalid)).toThrow();
  });

  it("rejects invalid successUrl", () => {
    const invalid = {
      rentalRequestId: "req_123",
      currency: "USD",
      successUrl: "not-a-url",
      cancelUrl: "https://example.com/cancel",
    };
    expect(() => CreateCheckoutSessionSchema.parse(invalid)).toThrow();
  });

  it("rejects invalid cancelUrl", () => {
    const invalid = {
      rentalRequestId: "req_123",
      currency: "USD",
      successUrl: "https://example.com/success",
      cancelUrl: "not-a-url",
    };
    expect(() => CreateCheckoutSessionSchema.parse(invalid)).toThrow();
  });
});

describe("PaymentListFilterSchema", () => {
  it("parses empty filter", () => {
    expect(PaymentListFilterSchema.parse({})).toEqual({});
  });

  it("parses filter with rentalRequestId", () => {
    const filter = { rentalRequestId: "req_123" };
    expect(PaymentListFilterSchema.parse(filter)).toEqual(filter);
  });

  it("parses filter with contractId", () => {
    const filter = { contractId: "contract_123" };
    expect(PaymentListFilterSchema.parse(filter)).toEqual(filter);
  });

  it("parses filter with status", () => {
    const filter = { status: "paid" };
    expect(PaymentListFilterSchema.parse(filter)).toEqual(filter);
  });

  it("parses filter with all fields", () => {
    const filter = {
      rentalRequestId: "req_123",
      contractId: "contract_123",
      status: "processing",
    };
    expect(PaymentListFilterSchema.parse(filter)).toEqual(filter);
  });

  it("rejects invalid status", () => {
    const filter = { status: "invalid" };
    expect(() => PaymentListFilterSchema.parse(filter)).toThrow();
  });
});