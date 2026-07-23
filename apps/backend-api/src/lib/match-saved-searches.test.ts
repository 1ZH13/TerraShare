import { describe, expect, it } from "bun:test";

import { matchesFilters } from "./match-saved-searches";
import type { ILand } from "../db/schemas";

/**
 * El emparejador decide qué alertas recibe el usuario (HU-99). Lo que se prueba
 * aquí sobre todo es que cubra **los mismos campos que el catálogo deja
 * guardar** (#368): un filtro que la interfaz permite fijar pero el emparejador
 * ignora produce avisos que incumplen los criterios del propio usuario.
 */

const land = (over: Partial<ILand> = {}): ILand =>
  ({
    id: "land_test",
    ownerId: "owner_1",
    title: "Finca Los Naranjos",
    description: "Hacienda cafetalera con beneficio húmedo",
    area: 22,
    allowedUses: ["agricultura"],
    location: { province: "Chiriquí", district: "Boquete" },
    availability: {},
    priceRule: { currency: "USD", pricePerMonth: 2100 },
    status: "active",
    operation: "alquiler",
    ...over,
  }) as unknown as ILand;

describe("matchesFilters — ubicación y uso", () => {
  it("acepta un terreno que cumple provincia, distrito y uso", () => {
    expect(matchesFilters(land(), { province: "Chiriquí", district: "Boquete", use: "agricultura" })).toBe(true);
  });

  it("descarta otra provincia", () => {
    expect(matchesFilters(land(), { province: "Coclé" })).toBe(false);
  });

  it("una búsqueda guardada sin tildes sigue casando (#391)", () => {
    // Los terrenos ahora se guardan con la forma canónica («Chiriquí»), pero
    // las búsquedas guardadas hace meses conservan lo que se escribió entonces.
    // Sin esto, su dueño dejaría de recibir avisos sin enterarse.
    expect(matchesFilters(land(), { province: "Chiriqui" })).toBe(true);
    expect(matchesFilters(land(), { province: "CHIRIQUI" })).toBe(true);
    expect(matchesFilters(land(), { district: "boquete" })).toBe(true);
  });

  it("descarta otro distrito", () => {
    expect(matchesFilters(land(), { district: "David" })).toBe(false);
  });

  it("descarta un uso que el terreno no admite", () => {
    expect(matchesFilters(land(), { use: "ganaderia" })).toBe(false);
  });

  it("un filtro vacío acepta cualquier terreno", () => {
    expect(matchesFilters(land(), {})).toBe(true);
  });
});

describe("matchesFilters — tipo de operación", () => {
  it("descarta un alquiler cuando se busca comprar", () => {
    expect(matchesFilters(land({ operation: "alquiler" } as Partial<ILand>), { operation: "venta" })).toBe(false);
  });

  it("acepta un terreno de «ambas» tanto para alquiler como para venta", () => {
    const both = land({ operation: "ambas" } as Partial<ILand>);
    expect(matchesFilters(both, { operation: "alquiler" })).toBe(true);
    expect(matchesFilters(both, { operation: "venta" })).toBe(true);
  });

  it("«todas» no descarta nada", () => {
    expect(matchesFilters(land({ operation: "venta" } as Partial<ILand>), { operation: "todas" })).toBe(true);
  });
});

describe("matchesFilters — texto libre", () => {
  it("encuentra el término en el título sin distinguir mayúsculas", () => {
    expect(matchesFilters(land(), { q: "naranjos" })).toBe(true);
  });

  it("encuentra el término en la descripción", () => {
    expect(matchesFilters(land(), { q: "cafetalera" })).toBe(true);
  });

  it("ignora los acentos en los dos sentidos", () => {
    expect(matchesFilters(land(), { q: "chiriqui" })).toBe(true);
    expect(matchesFilters(land({ title: "Finca Boqueté" }), { q: "boquete" })).toBe(true);
  });

  it("descarta un término que no aparece", () => {
    expect(matchesFilters(land(), { q: "acuicultura" })).toBe(false);
  });

  it("un texto en blanco no filtra", () => {
    expect(matchesFilters(land(), { q: "   " })).toBe(true);
  });
});

describe("matchesFilters — precio", () => {
  it("acepta dentro del tramo", () => {
    expect(matchesFilters(land(), { priceMin: 1000, priceMax: 3000 })).toBe(true);
  });

  it("descarta por encima del máximo", () => {
    expect(matchesFilters(land(), { priceMax: 1500 })).toBe(false);
  });

  it("descarta por debajo del mínimo", () => {
    expect(matchesFilters(land(), { priceMin: 2500 })).toBe(false);
  });

  it("un terreno de solo venta no cuela en un tramo «hasta $X»", () => {
    // Lleva `pricePerMonth: 0`, que antes pasaba cualquier máximo.
    const forSale = land({ operation: "venta", priceRule: { currency: "USD", pricePerMonth: 0 } } as Partial<ILand>);
    expect(matchesFilters(forSale, { priceMax: 500 })).toBe(false);
  });

  it("sin filtro de precio, el terreno de venta sí entra", () => {
    const forSale = land({ operation: "venta", priceRule: { currency: "USD", pricePerMonth: 0 } } as Partial<ILand>);
    expect(matchesFilters(forSale, { operation: "venta" })).toBe(true);
  });
});

describe("matchesFilters — combinaciones", () => {
  it("exige que se cumplan todos los criterios a la vez", () => {
    const filters = { province: "Chiriquí", use: "agricultura", operation: "alquiler", priceMax: 2500, q: "naranjos" };
    expect(matchesFilters(land(), filters)).toBe(true);
    // Basta con que uno falle.
    expect(matchesFilters(land(), { ...filters, priceMax: 1000 })).toBe(false);
    expect(matchesFilters(land(), { ...filters, q: "estanques" })).toBe(false);
  });
});
