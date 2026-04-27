import { describe, expect, it } from "bun:test";
import {
  ContractStatusSchema,
  ContractTermsSchema,
  CreateContractSchema,
  UpdateContractStatusSchema,
} from "./contracts";

describe("ContractStatusSchema", () => {
  it("parses valid statuses", () => {
    expect(ContractStatusSchema.parse("draft")).toBe("draft");
    expect(ContractStatusSchema.parse("active")).toBe("active");
    expect(ContractStatusSchema.parse("completed")).toBe("completed");
    expect(ContractStatusSchema.parse("cancelled")).toBe("cancelled");
  });

  it("rejects invalid status", () => {
    expect(() => ContractStatusSchema.parse("invalid")).toThrow();
  });
});

describe("ContractTermsSchema", () => {
  it("parses valid terms", () => {
    const valid = {
      summary: "Contrato de arrendamiento de terreno agricola",
      startsAt: "2024-01-01",
      endsAt: "2024-12-31",
    };
    expect(ContractTermsSchema.parse(valid)).toEqual(valid);
  });

  it("parses terms with signedAt", () => {
    const valid = {
      summary: "Contrato de arrendamiento",
      signedAt: "2024-01-01",
      startsAt: "2024-01-01",
      endsAt: "2024-12-31",
    };
    expect(ContractTermsSchema.parse(valid)).toEqual(valid);
  });

  it("rejects short summary", () => {
    const invalid = {
      summary: "Short",
      startsAt: "2024-01-01",
      endsAt: "2024-12-31",
    };
    expect(() => ContractTermsSchema.parse(invalid)).toThrow();
  });

  it("rejects invalid startsAt date", () => {
    const invalid = {
      summary: "Contrato de arrendamiento",
      startsAt: "invalid",
      endsAt: "2024-12-31",
    };
    expect(() => ContractTermsSchema.parse(invalid)).toThrow();
  });

  it("rejects invalid endsAt date", () => {
    const invalid = {
      summary: "Contrato de arrendamiento",
      startsAt: "2024-01-01",
      endsAt: "invalid",
    };
    expect(() => ContractTermsSchema.parse(invalid)).toThrow();
  });

  it("rejects endsAt before startsAt", () => {
    const invalid = {
      summary: "Contrato de arrendamiento",
      startsAt: "2024-12-31",
      endsAt: "2024-01-01",
    };
    expect(() => ContractTermsSchema.parse(invalid)).toThrow();
  });
});

describe("CreateContractSchema", () => {
  it("parses valid contract", () => {
    const valid = {
      rentalRequestId: "req_123",
      terms: {
        summary: "Contrato de arrendamiento",
        startsAt: "2024-01-01",
        endsAt: "2024-12-31",
      },
    };
    expect(CreateContractSchema.parse(valid)).toEqual(valid);
  });

  it("rejects empty rentalRequestId", () => {
    const invalid = {
      rentalRequestId: "",
      terms: {
        summary: "Contrato de arrendamiento",
        startsAt: "2024-01-01",
        endsAt: "2024-12-31",
      },
    };
    expect(() => CreateContractSchema.parse(invalid)).toThrow();
  });
});

describe("UpdateContractStatusSchema", () => {
  it("parses status change to active", () => {
    expect(UpdateContractStatusSchema.parse({ status: "active" })).toEqual({ status: "active" });
  });

  it("parses status change to completed", () => {
    expect(UpdateContractStatusSchema.parse({ status: "completed" })).toEqual({ status: "completed" });
  });

  it("parses status change to cancelled with reason", () => {
    const valid = { status: "cancelled", reason: "Mutuo acuerdo" };
    expect(UpdateContractStatusSchema.parse(valid)).toEqual(valid);
  });

  it("rejects draft status in update", () => {
    expect(() => UpdateContractStatusSchema.parse({ status: "draft" })).toThrow();
  });

  it("rejects invalid status", () => {
    expect(() => UpdateContractStatusSchema.parse({ status: "invalid" })).toThrow();
  });
});