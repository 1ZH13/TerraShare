import { describe, expect, it } from "bun:test";
import type { LandDto } from "@terrashare/shared";

import { formatLandPrice, formatLandPriceShort, monthlyPrice, salePrice } from "./land-price";

/**
 * El caso que originó el helper (#365): un terreno de solo venta lleva
 * `pricePerMonth: 0`, y `typeof 0 === "number"` es cierto, así que todas las
 * pantallas anunciaban «$0/mes» en vez del precio de venta.
 */

const land = (over: Partial<LandDto>): LandDto =>
  ({
    id: "land_test",
    ownerId: "owner",
    title: "Terreno",
    area: 10,
    allowedUses: ["agricultura"],
    location: { province: "Panamá", district: "Chepo" },
    availability: {},
    priceRule: { currency: "USD", pricePerMonth: 0 },
    status: "active",
    operation: "alquiler",
    ...over,
  }) as LandDto;

describe("formatLandPrice", () => {
  it("muestra la renta mensual de un terreno de alquiler", () => {
    const result = formatLandPrice(land({ operation: "alquiler", priceRule: { currency: "USD", pricePerMonth: 1250 } }));
    expect(result).toBe("$1,250/mes");
  });

  it("muestra el precio de venta, no «$0/mes», en un terreno de solo venta", () => {
    const result = formatLandPrice(land({ operation: "venta", salePrice: 145000 }));
    expect(result).toBe("$145,000 en venta");
    expect(result).not.toContain("/mes");
  });

  it("muestra los dos precios cuando el terreno admite ambas operaciones", () => {
    const result = formatLandPrice(
      land({ operation: "ambas", priceRule: { currency: "USD", pricePerMonth: 780 }, salePrice: 96000 }),
    );
    expect(result).toBe("$780/mes · $96,000 en venta");
  });

  it("cae a «Precio a convenir» si no hay ningún precio utilizable", () => {
    expect(formatLandPrice(land({ operation: "venta" }))).toBe("Precio a convenir");
    expect(formatLandPrice(land({ operation: "alquiler" }))).toBe("Precio a convenir");
  });
});

describe("formatLandPriceShort", () => {
  it("prioriza la renta cuando existe", () => {
    const result = formatLandPriceShort(
      land({ operation: "ambas", priceRule: { currency: "USD", pricePerMonth: 780 }, salePrice: 96000 }),
    );
    expect(result).toBe("$780/mes");
  });

  it("cae al precio de venta si el terreno no se alquila", () => {
    expect(formatLandPriceShort(land({ operation: "venta", salePrice: 145000 }))).toBe("$145,000");
  });

  it("cae a «A consultar» sin precios", () => {
    expect(formatLandPriceShort(land({ operation: "alquiler" }))).toBe("A consultar");
  });
});

describe("monthlyPrice / salePrice", () => {
  it("el 0 cuenta como «sin renta», no como gratis", () => {
    expect(monthlyPrice(land({ operation: "alquiler", priceRule: { currency: "USD", pricePerMonth: 0 } }))).toBeNull();
  });

  it("un terreno de alquiler no expone precio de venta aunque lo lleve el documento", () => {
    expect(salePrice(land({ operation: "alquiler", salePrice: 50000 }))).toBeNull();
  });

  it("un terreno de venta no expone renta aunque lleve pricePerMonth", () => {
    expect(monthlyPrice(land({ operation: "venta", priceRule: { currency: "USD", pricePerMonth: 900 } }))).toBeNull();
  });
});
