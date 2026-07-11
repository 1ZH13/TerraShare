import { describe, expect, it } from "bun:test";
import { CreateRentalRequestSchema } from "./rental-requests";

/**
 * #140 F-1: el schema modela ambas operaciones (alquiler/venta) para coincidir
 * con el backend y con CreateRentalRequestDto.
 */
describe("CreateRentalRequestSchema (#140)", () => {
  const validPeriod = { startDate: "2026-01-01", endDate: "2026-02-01" };

  it("acepta un alquiler con period + intendedUse", () => {
    const result = CreateRentalRequestSchema.safeParse({
      landId: "land_1",
      period: validPeriod,
      intendedUse: "agricultura",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un alquiler sin period (por defecto operation=alquiler)", () => {
    const result = CreateRentalRequestSchema.safeParse({
      landId: "land_1",
      intendedUse: "agricultura",
    });
    expect(result.success).toBe(false);
  });

  it("acepta una venta con offerAmount", () => {
    const result = CreateRentalRequestSchema.safeParse({
      landId: "land_1",
      operation: "venta",
      offerAmount: 150000,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza una venta sin offerAmount", () => {
    const result = CreateRentalRequestSchema.safeParse({
      landId: "land_1",
      operation: "venta",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("offerAmount"))).toBe(true);
    }
  });

  it("rechaza offerAmount no positivo en venta", () => {
    const result = CreateRentalRequestSchema.safeParse({
      landId: "land_1",
      operation: "venta",
      offerAmount: 0,
    });
    expect(result.success).toBe(false);
  });
});
