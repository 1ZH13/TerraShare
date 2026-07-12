import { describe, expect, it } from "bun:test";

import { searchLands } from "./search-lands";

describe("search_lands tool (HU-63 #180)", () => {
  it("devuelve solo terrenos activos (excluye inactivos)", async () => {
    const res = await searchLands({});
    expect(res.items.length).toBe(3);
    expect(res.items.some((l) => (l as { id: string }).id === "land_inactive")).toBe(false);
  });

  it("filtra por provincia", async () => {
    const res = await searchLands({ province: "Chiriqui" });
    expect(res.items.length).toBe(2);
    expect(res.items.every((l) => (l as { location: { province: string } }).location.province === "Chiriqui")).toBe(true);
  });

  it("filtra por uso permitido", async () => {
    const res = await searchLands({ use: "forestal" });
    expect(res.items.length).toBe(1);
    expect((res.items[0] as { id: string }).id).toBe("land_c");
  });

  it("filtra por operación (venta)", async () => {
    const res = await searchLands({ operation: "venta" });
    expect(res.items.length).toBe(1);
    expect((res.items[0] as { id: string }).id).toBe("land_b");
  });

  it("filtra por rango de precio mensual", async () => {
    const res = await searchLands({ priceMin: 400, priceMax: 1000 });
    expect(res.items.length).toBe(1);
    expect((res.items[0] as { id: string }).id).toBe("land_b");
  });

  it("busca por texto en el título", async () => {
    const res = await searchLands({ q: "forestal" });
    expect(res.items.length).toBe(1);
    expect((res.items[0] as { id: string }).id).toBe("land_c");
  });

  it("ordena por precio ascendente", async () => {
    const res = await searchLands({ sort: "price", order: "asc" });
    const prices = res.items.map((l) => (l as { priceRule: { pricePerMonth: number } }).priceRule.pricePerMonth);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("pagina los resultados", async () => {
    const res = await searchLands({ pageSize: 2, page: 1 });
    expect(res.items.length).toBe(2);
    expect(res.pagination.totalItems).toBe(3);
    expect(res.pagination.totalPages).toBe(2);
  });

  it("no expone campos internos de Mongo (_id, __v)", async () => {
    const res = await searchLands({});
    expect(res.items.every((l) => !("_id" in l) && !("__v" in l))).toBe(true);
  });
});
