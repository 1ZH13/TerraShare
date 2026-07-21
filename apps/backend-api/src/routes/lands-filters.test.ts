import { describe, expect, it, beforeEach } from "bun:test";

import { requestJson } from "../lib/http-test-utils";
import { Land } from "../db/schemas";

/**
 * Filtrado y paginación del catálogo en el servidor (#366).
 *
 * El catálogo filtraba en el cliente sobre la primera página que devolvía la
 * API, así que pedía 100 registros y aun así ocultaba lo que no cupiera. Al
 * mover los filtros aquí, estas pruebas fijan que el servidor reproduce lo que
 * hacía la interfaz — incluida la búsqueda por subcadena sobre provincia y
 * distrito, que `$text` no cubría — y que la paginación declara el total real.
 *
 * Gotcha de bun:test + mongodb-memory-server: se siembra en `beforeEach` y el
 * cuerpo del test solo lee.
 */

const base = {
  area: 20,
  location: { province: "Coclé", district: "Penonomé" },
  availability: {},
  status: "active" as const,
};

const ids = (payload: { data: { items: { id: string }[] } }) => payload.data.items.map((l) => l.id);

describe("GET /lands — filtros en el servidor", () => {
  beforeEach(async () => {
    await Land.create([
      {
        ...base, id: "lf_alquiler", ownerId: "own_1", title: "Potrero de alquiler",
        description: "Pasto establecido", allowedUses: ["ganaderia"],
        priceRule: { currency: "USD", pricePerMonth: 900 }, operation: "alquiler",
      },
      {
        ...base, id: "lf_venta", ownerId: "own_1", title: "Lote solo venta",
        description: "Ideal para inversión", allowedUses: ["otro"],
        // Un terreno de solo venta lleva renta 0: es el que colaba en los tramos.
        priceRule: { currency: "USD", pricePerMonth: 0 }, operation: "venta", salePrice: 90000,
      },
      {
        ...base, id: "lf_ambas", ownerId: "own_1", title: "Finca mixta",
        description: "Se alquila o se vende", allowedUses: ["agricultura"],
        priceRule: { currency: "USD", pricePerMonth: 1200 }, operation: "ambas", salePrice: 150000,
      },
      {
        ...base, id: "lf_boquete", ownerId: "own_2", title: "Hacienda cafetalera",
        description: "Altura y sombra", allowedUses: ["agricultura"],
        location: { province: "Chiriquí", district: "Boquete" },
        priceRule: { currency: "USD", pricePerMonth: 2500 }, operation: "alquiler",
      },
      {
        ...base, id: "lf_borrador", ownerId: "own_2", title: "Sin publicar",
        allowedUses: ["mixto"], priceRule: { currency: "USD", pricePerMonth: 100 },
        operation: "alquiler", status: "draft",
      },
    ]);
  });

  it("solo devuelve terrenos publicados", async () => {
    const { payload } = await requestJson("/api/v1/lands?pageSize=100");
    expect(ids(payload)).not.toContain("lf_borrador");
  });

  it("filtra por operación, y «ambas» cuenta para las dos caras", async () => {
    const alquiler = await requestJson("/api/v1/lands?operation=alquiler&pageSize=100");
    expect(ids(alquiler.payload)).toContain("lf_alquiler");
    expect(ids(alquiler.payload)).toContain("lf_ambas");
    expect(ids(alquiler.payload)).not.toContain("lf_venta");

    const venta = await requestJson("/api/v1/lands?operation=venta&pageSize=100");
    expect(ids(venta.payload)).toContain("lf_venta");
    expect(ids(venta.payload)).toContain("lf_ambas");
    expect(ids(venta.payload)).not.toContain("lf_alquiler");
  });

  it("«todas» no filtra por operación", async () => {
    const { payload } = await requestJson("/api/v1/lands?operation=todas&pageSize=100");
    for (const id of ["lf_alquiler", "lf_venta", "lf_ambas"]) {
      expect(ids(payload)).toContain(id);
    }
  });

  it("un terreno de solo venta no cuela en un tramo «hasta $X»", async () => {
    // Su `pricePerMonth` es 0, que satisface cualquier `$lte`.
    const { payload } = await requestJson("/api/v1/lands?priceMax=500&pageSize=100");
    expect(ids(payload)).not.toContain("lf_venta");
  });

  it("el precio máximo respeta el alquiler y el terreno de ambas operaciones", async () => {
    const { payload } = await requestJson("/api/v1/lands?priceMax=1000&pageSize=100");
    expect(ids(payload)).toContain("lf_alquiler");
    expect(ids(payload)).not.toContain("lf_ambas"); // 1200 > 1000
    expect(ids(payload)).not.toContain("lf_boquete"); // 2500 > 1000
  });

  it("pedir «en venta» con un máximo mensual no devuelve nada, que es lo honesto", async () => {
    // Una venta no tiene renta con la que comparar: la intersección es vacía.
    const { payload } = await requestJson("/api/v1/lands?operation=venta&priceMax=1000&pageSize=100");
    expect(ids(payload)).not.toContain("lf_venta");
  });

  it("busca por subcadena en el título", async () => {
    const { payload } = await requestJson("/api/v1/lands?q=cafetalera&pageSize=100");
    expect(ids(payload)).toEqual(["lf_boquete"]);
  });

  it("busca en la descripción", async () => {
    const { payload } = await requestJson("/api/v1/lands?q=inversi&pageSize=100");
    expect(ids(payload)).toContain("lf_venta");
  });

  it("busca por provincia y distrito, que el índice de texto no cubría", async () => {
    const prov = await requestJson("/api/v1/lands?q=chiriqu&pageSize=100");
    expect(ids(prov.payload)).toContain("lf_boquete");

    const dist = await requestJson("/api/v1/lands?q=boque&pageSize=100");
    expect(ids(dist.payload)).toContain("lf_boquete");
  });

  it("la búsqueda ignora mayúsculas", async () => {
    const { payload } = await requestJson("/api/v1/lands?q=POTRERO&pageSize=100");
    expect(ids(payload)).toContain("lf_alquiler");
  });

  it("combina varios criterios a la vez", async () => {
    const { payload } = await requestJson(
      "/api/v1/lands?province=Coclé&operation=alquiler&priceMax=1000&pageSize=100",
    );
    expect(ids(payload)).toEqual(["lf_alquiler"]);
  });

  it("filtra por uso", async () => {
    const { payload } = await requestJson("/api/v1/lands?use=ganaderia&pageSize=100");
    expect(ids(payload)).toContain("lf_alquiler");
    expect(ids(payload)).not.toContain("lf_boquete");
  });
});

describe("GET /lands — paginación", () => {
  beforeEach(async () => {
    await Land.create(
      Array.from({ length: 7 }, (_, i) => ({
        ...base,
        id: `lp_${i}`,
        ownerId: "own_pag",
        title: `Parcela paginada ${i}`,
        allowedUses: ["agricultura"],
        priceRule: { currency: "USD", pricePerMonth: 100 + i },
        operation: "alquiler",
      })),
    );
  });

  it("declara el total real, no el tamaño de la página", async () => {
    const { payload } = await requestJson("/api/v1/lands?q=paginada&pageSize=3");

    expect(payload.data.items.length).toBe(3);
    expect(payload.data.pagination.totalItems).toBe(7);
    expect(payload.data.pagination.totalPages).toBe(3);
  });

  it("la última página trae el resto", async () => {
    const { payload } = await requestJson("/api/v1/lands?q=paginada&pageSize=3&page=3");
    expect(payload.data.items.length).toBe(1);
    expect(payload.data.pagination.page).toBe(3);
  });

  it("las páginas no se solapan ni pierden registros", async () => {
    const seen: string[] = [];
    for (const page of [1, 2, 3]) {
      const { payload } = await requestJson(`/api/v1/lands?q=paginada&pageSize=3&page=${page}`);
      seen.push(...ids(payload));
    }
    expect(new Set(seen).size).toBe(7);
  });

  it("una página más allá del final devuelve vacío, sin romper", async () => {
    const { response, payload } = await requestJson("/api/v1/lands?q=paginada&pageSize=3&page=99");
    expect(response.status).toBe(200);
    expect(payload.data.items).toEqual([]);
  });
});

describe("GET /lands/facets", () => {
  beforeEach(async () => {
    await Land.create([
      {
        ...base, id: "lfac_1", ownerId: "own_f", title: "Faceta publicada",
        allowedUses: ["ganaderia"], priceRule: { currency: "USD", pricePerMonth: 100 },
        operation: "alquiler", location: { province: "Herrera", district: "Chitré" },
      },
      {
        ...base, id: "lfac_2", ownerId: "own_f", title: "Faceta oculta",
        allowedUses: ["acuicultura"], priceRule: { currency: "USD", pricePerMonth: 100 },
        // Provincia inventada a propósito: las reales aparecen en los fixtures
        // compartidos, así que buscar una de ellas no probaría nada.
        operation: "alquiler", location: { province: "Provincia Fantasma", district: "Yaviza" },
        status: "draft",
      },
    ]);
  });

  it("devuelve las provincias y usos de los terrenos publicados", async () => {
    const { response, payload } = await requestJson("/api/v1/lands/facets");
    expect(response.status).toBe(200);
    expect(payload.data.provinces).toContain("Herrera");
    expect(payload.data.uses).toContain("ganaderia");
  });

  it("no expone los de terrenos sin publicar", async () => {
    const { payload } = await requestJson("/api/v1/lands/facets");
    // El mismo `status: "active"` gobierna las dos facetas, así que basta con
    // comprobar la provincia, que es el único valor que puedo garantizar que
    // solo existe en el borrador sembrado aquí.
    expect(payload.data.provinces).not.toContain("Provincia Fantasma");
  });

  it("las provincias vienen ordenadas y sin repetir", async () => {
    const { payload } = await requestJson("/api/v1/lands/facets");
    const provinces = payload.data.provinces as string[];
    expect(new Set(provinces).size).toBe(provinces.length);
    expect([...provinces].sort((a, b) => a.localeCompare(b, "es"))).toEqual(provinces);
  });

  it("es pública: alimenta un catálogo que no exige sesión para el detalle", async () => {
    const { response } = await requestJson("/api/v1/lands/facets");
    expect(response.status).toBe(200);
  });
});
