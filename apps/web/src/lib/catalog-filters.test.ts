import { describe, expect, it } from "bun:test";

import {
  ANY_OPERATION,
  ANY_PROVINCE,
  ANY_USE,
  EMPTY_FILTERS,
  NO_PRICE_LIMIT,
  describeFilters,
  filtersToParams,
  hasAnyFilter,
  paramsToFilters,
  suggestName,
} from "./catalog-filters";

/**
 * Estas claves son el contrato entre el catálogo, las búsquedas guardadas y el
 * emparejador del backend (#368): si cambian de nombre o de forma, las alertas
 * dejan de corresponderse con lo que el usuario guardó.
 */

describe("filtersToParams", () => {
  it("omite los criterios sin filtrar, para no mandar centinelas al backend", () => {
    expect(filtersToParams(EMPTY_FILTERS)).toEqual({});
  });

  it("incluye solo lo que está activo", () => {
    expect(
      filtersToParams({ q: "  boquete  ", use: "agricultura", province: ANY_PROVINCE, operation: "venta", maxPrice: 1500 }),
    ).toEqual({ q: "boquete", use: "agricultura", operation: "venta", priceMax: 1500 });
  });

  it("el precio sale como número, que es lo que exige el emparejador del backend", () => {
    // Con un texto, `typeof filters.priceMax === "number"` falla en el servidor
    // y la alerta deja de filtrar por precio sin avisar.
    expect(typeof filtersToParams({ ...EMPTY_FILTERS, maxPrice: 1500 }).priceMax).toBe("number");
  });

  it("el tope del desplegable no se guarda como filtro de precio", () => {
    expect(filtersToParams({ ...EMPTY_FILTERS, maxPrice: NO_PRICE_LIMIT }).priceMax).toBeUndefined();
  });
});

describe("paramsToFilters", () => {
  it("sin parámetros devuelve los filtros vacíos", () => {
    expect(paramsToFilters(undefined)).toEqual(EMPTY_FILTERS);
    expect(paramsToFilters({})).toEqual(EMPTY_FILTERS);
  });

  it("acepta priceMax como número o como texto", () => {
    expect(paramsToFilters({ priceMax: 900 }).maxPrice).toBe(900);
    expect(paramsToFilters({ priceMax: "900" }).maxPrice).toBe(900);
  });

  it("un priceMax ilegible no rompe: cae al tope", () => {
    expect(paramsToFilters({ priceMax: "mucho" }).maxPrice).toBe(NO_PRICE_LIMIT);
  });

  it("ida y vuelta conserva los criterios", () => {
    const original = { q: "café", use: "agricultura", province: "Chiriquí", operation: "alquiler", maxPrice: 2000 };
    expect(paramsToFilters(filtersToParams(original))).toEqual(original);
  });
});

describe("hasAnyFilter", () => {
  it("es falso sin ningún criterio", () => {
    expect(hasAnyFilter(EMPTY_FILTERS)).toBe(false);
    expect(hasAnyFilter({ ...EMPTY_FILTERS, q: "   " })).toBe(false);
  });

  it("es cierto en cuanto hay uno", () => {
    expect(hasAnyFilter({ ...EMPTY_FILTERS, province: "Coclé" })).toBe(true);
    expect(hasAnyFilter({ ...EMPTY_FILTERS, maxPrice: 500 })).toBe(true);
    expect(hasAnyFilter({ ...EMPTY_FILTERS, q: "río" })).toBe(true);
  });
});

describe("describeFilters", () => {
  it("resume los criterios activos en orden legible", () => {
    expect(
      describeFilters({ operation: "alquiler", use: "ganaderia", province: "Coclé", priceMax: "1500" }),
    ).toBe("En alquiler · Ganadería · Coclé · hasta $1,500/mes");
  });

  it("entrecomilla el texto libre", () => {
    expect(describeFilters({ q: "boquete" })).toBe("«boquete»");
  });

  it("sin criterios lo dice explícitamente", () => {
    expect(describeFilters({})).toBe("Cualquier terreno");
  });
});

describe("suggestName", () => {
  it("propone el resumen como nombre", () => {
    expect(suggestName({ ...EMPTY_FILTERS, province: "Chiriquí", use: "agricultura" }))
      .toBe("Agricultura · Chiriquí");
  });

  it("sin criterios propone algo con sentido en vez de «Cualquier terreno»", () => {
    expect(suggestName(EMPTY_FILTERS)).toBe("Todos los terrenos");
  });

  it("respeta los valores centinela de los desplegables", () => {
    expect(suggestName({ q: "", use: ANY_USE, province: ANY_PROVINCE, operation: ANY_OPERATION, maxPrice: NO_PRICE_LIMIT }))
      .toBe("Todos los terrenos");
  });
});
