import { describe, expect, it } from "bun:test";
import {
  LandUseSchema,
  LandStatusSchema,
  LandLocationSchema,
  LandAvailabilitySchema,
  LandPriceRuleSchema,
  CreateLandSchema,
  UpdateLandSchema,
  UpdateLandStatusSchema,
  LandFilterSchema,
} from "./lands";

describe("LandUseSchema", () => {
  it("parses valid land uses", () => {
    expect(LandUseSchema.parse("agricultura")).toBe("agricultura");
    expect(LandUseSchema.parse("ganaderia")).toBe("ganaderia");
    expect(LandUseSchema.parse("forestal")).toBe("forestal");
    expect(LandUseSchema.parse("acuicultura")).toBe("acuicultura");
    expect(LandUseSchema.parse("mixto")).toBe("mixto");
    expect(LandUseSchema.parse("otro")).toBe("otro");
  });

  it("rejects invalid land use", () => {
    expect(() => LandUseSchema.parse("invalid")).toThrow();
  });
});

describe("LandStatusSchema", () => {
  it("parses valid statuses", () => {
    expect(LandStatusSchema.parse("draft")).toBe("draft");
    expect(LandStatusSchema.parse("active")).toBe("active");
    expect(LandStatusSchema.parse("inactive")).toBe("inactive");
  });

  it("rejects invalid status", () => {
    expect(() => LandStatusSchema.parse("pending")).toThrow();
  });
});

describe("LandLocationSchema", () => {
  it("parses valid location with required fields", () => {
    const valid = {
      province: "Panama Oeste",
      district: "Arraijan",
    };
    expect(LandLocationSchema.parse(valid)).toEqual(valid);
  });

  it("parses valid location with all fields", () => {
    const valid = {
      province: "Panama",
      district: "Casco Antiguo",
      corregimiento: "Casco Antiguo",
      addressLine: "Calle ",
      lat: 8.9515,
      lng: -79.5164,
    };
    expect(LandLocationSchema.parse(valid)).toEqual(valid);
  });

  it("rejects missing province", () => {
    const invalid = { district: "Arraijan" };
    expect(() => LandLocationSchema.parse(invalid)).toThrow();
  });

  it("rejects empty province", () => {
    const invalid = { province: "", district: "Arraijan" };
    expect(() => LandLocationSchema.parse(invalid)).toThrow();
  });
});

describe("LandAvailabilitySchema", () => {
  it("parses empty availability", () => {
    expect(LandAvailabilitySchema.parse({})).toEqual({});
  });

  it("parses availability with dates", () => {
    const valid = {
      availableFrom: "2024-01-01",
      availableTo: "2024-12-31",
    };
    expect(LandAvailabilitySchema.parse(valid)).toEqual(valid);
  });
});

describe("LandPriceRuleSchema", () => {
  it("parses valid price rule", () => {
    const valid = { currency: "USD", pricePerMonth: 500 };
    expect(LandPriceRuleSchema.parse(valid)).toEqual(valid);
  });

  it("parses valid price rule with PAB", () => {
    const valid = { currency: "PAB", pricePerMonth: 500 };
    expect(LandPriceRuleSchema.parse(valid)).toEqual(valid);
  });

  it("rejects negative price", () => {
    const invalid = { currency: "USD", pricePerMonth: -100 };
    expect(() => LandPriceRuleSchema.parse(invalid)).toThrow();
  });

  it("rejects zero price", () => {
    const invalid = { currency: "USD", pricePerMonth: 0 };
    expect(() => LandPriceRuleSchema.parse(invalid)).toThrow();
  });
});

describe("CreateLandSchema", () => {
  it("parses valid land", () => {
    const valid = {
      title: "Terreno Agricola",
      description: "Description",
      area: 1000,
      allowedUses: ["agricultura"],
      location: { province: "Panama", district: "Panama" },
      priceRule: { currency: "USD", pricePerMonth: 500 },
    };
    expect(CreateLandSchema.parse(valid)).toEqual(valid);
  });

  it("parses valid land with multiple uses", () => {
    const valid = {
      title: "Terreno Mixto",
      area: 5000,
      allowedUses: ["agricultura", "ganaderia"],
      location: { province: "Chiriqui", district: "David" },
      priceRule: { currency: "PAB", pricePerMonth: 1500 },
    };
    expect(CreateLandSchema.parse(valid)).toEqual(valid);
  });

  it("rejects short title", () => {
    const invalid = {
      title: "AB",
      area: 1000,
      allowedUses: ["agricultura"],
      location: { province: "Panama", district: "Panama" },
      priceRule: { currency: "USD", pricePerMonth: 500 },
    };
    expect(() => CreateLandSchema.parse(invalid)).toThrow();
  });

  it("rejects zero area", () => {
    const invalid = {
      title: "Terreno",
      area: 0,
      allowedUses: ["agricultura"],
      location: { province: "Panama", district: "Panama" },
      priceRule: { currency: "USD", pricePerMonth: 500 },
    };
    expect(() => CreateLandSchema.parse(invalid)).toThrow();
  });

  it("rejects empty uses array", () => {
    const invalid = {
      title: "Terreno",
      area: 1000,
      allowedUses: [],
      location: { province: "Panama", district: "Panama" },
      priceRule: { currency: "USD", pricePerMonth: 500 },
    };
    expect(() => CreateLandSchema.parse(invalid)).toThrow();
  });

  it("rejects invalid use in array", () => {
    const invalid = {
      title: "Terreno",
      area: 1000,
      allowedUses: ["invalidUse"],
      location: { province: "Panama", district: "Panama" },
      priceRule: { currency: "USD", pricePerMonth: 500 },
    };
    expect(() => CreateLandSchema.parse(invalid)).toThrow();
  });
});

describe("UpdateLandSchema", () => {
  it("parses empty update", () => {
    expect(UpdateLandSchema.parse({})).toEqual({});
  });

  it("parses partial update with title", () => {
    const update = { title: "New Title" };
    expect(UpdateLandSchema.parse(update)).toEqual(update);
  });

  it("parses partial update with price", () => {
    const update = { priceRule: { currency: "USD", pricePerMonth: 750 } };
    expect(UpdateLandSchema.parse(update)).toEqual(update);
  });

  it("rejects invalid price in update", () => {
    const update = { priceRule: { currency: "USD", pricePerMonth: -50 } };
    expect(() => UpdateLandSchema.parse(update)).toThrow();
  });
});

describe("UpdateLandStatusSchema", () => {
  it("parses valid status update", () => {
    expect(UpdateLandStatusSchema.parse({ status: "active" })).toEqual({ status: "active" });
  });

  it("parses status change to inactive", () => {
    expect(UpdateLandStatusSchema.parse({ status: "inactive" })).toEqual({ status: "inactive" });
  });

  it("rejects invalid status", () => {
    expect(() => UpdateLandStatusSchema.parse({ status: "pending" })).toThrow();
  });
});

describe("LandFilterSchema", () => {
  it("parses default filter", () => {
    const result = LandFilterSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.sort).toBe("createdAt");
    expect(result.order).toBe("desc");
  });

  it("parses filter with pagination", () => {
    const result = LandFilterSchema.parse({ page: "2", pageSize: "50" });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(50);
  });

  it("parses filter with sorting", () => {
    const result = LandFilterSchema.parse({ sort: "price", order: "asc" });
    expect(result.sort).toBe("price");
    expect(result.order).toBe("asc");
  });

  it("parses filter with location", () => {
    const result = LandFilterSchema.parse({ province: "Panama", district: "Panama" });
    expect(result.province).toBe("Panama");
    expect(result.district).toBe("Panama");
  });

  it("parses filter with use", () => {
    const result = LandFilterSchema.parse({ use: "agricultura" });
    expect(result.use).toBe("agricultura");
  });

  it("parses filter with price range", () => {
    const result = LandFilterSchema.parse({ priceMin: "100", priceMax: "1000" });
    expect(result.priceMin).toBe(100);
    expect(result.priceMax).toBe(1000);
  });

  it("rejects page 0", () => {
    expect(() => LandFilterSchema.parse({ page: "0" })).toThrow();
  });

  it("rejects negative page size", () => {
    expect(() => LandFilterSchema.parse({ pageSize: "-10" })).toThrow();
  });

  it("rejects page size over 100", () => {
    expect(() => LandFilterSchema.parse({ pageSize: "200" })).toThrow();
  });

  it("rejects invalid sort field", () => {
    expect(() => LandFilterSchema.parse({ sort: "invalid" })).toThrow();
  });
});