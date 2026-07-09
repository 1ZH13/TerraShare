import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

describe("lands routes", () => {
  it("returns public lands list", async () => {
    const { response, payload } = await requestJson("/api/v1/lands");

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.data.items)).toBe(true);
  });

  it("creates a land with dev auth bypass", async () => {
    const { response, payload } = await requestJson("/api/v1/lands", {
      method: "POST",
      headers: {
        "x-dev-user-id": "user_owner_test",
      },
      body: {
        title: "Lote de prueba",
        area: 50,
        allowedUses: ["agricultura"],
        location: {
          province: "Panama",
          district: "Panama",
        },
        priceRule: {
          currency: "USD",
          pricePerMonth: 500,
        },
      },
    });

    expect(response.status).toBe(201);
    expect(payload.ok).toBe(true);
    expect(payload.data.ownerId).toBe("user_owner_test");
  });

  it("returns the caller's own lands at /lands/me", async () => {
    const { response, payload } = await requestJson("/api/v1/lands/me", {
      headers: { "x-dev-user-id": "user_owner_01" },
    });

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.data.length).toBeGreaterThan(0);
    for (const land of payload.data) {
      expect(land.ownerId).toBe("user_owner_01");
    }
  });

  // #135: los filtros se resuelven en la BD (Mongoose), no en JS sobre todo el set.
  it("resolves catalog filters in the database and strips Mongo _id/__v", async () => {
    const province = "ProvVerif135";
    const create = await requestJson("/api/v1/lands", {
      method: "POST",
      headers: { "x-dev-user-id": "user_filter_owner" },
      body: {
        title: "Terreno filtrable",
        area: 42,
        allowedUses: ["agricultura"],
        location: { province, district: "Distrito1" },
        priceRule: { currency: "USD", pricePerMonth: 777 },
      },
    });
    const landId = create.payload.data.id;
    // El catálogo público solo muestra activos; se publica.
    await requestJson(`/api/v1/lands/${landId}/status`, {
      method: "PATCH",
      headers: { "x-dev-user-id": "user_filter_owner" },
      body: { status: "active" },
    });

    const match = await requestJson(`/api/v1/lands?province=${province.toLowerCase()}&priceMax=1000`);
    expect(match.response.status).toBe(200);
    const items = match.payload.data.items;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(landId);
    // Respuestas limpias, sin metadatos de Mongo.
    expect(items[0]._id).toBeUndefined();
    expect(items[0].__v).toBeUndefined();

    // El filtro de precio se aplica en la BD: priceMax<precio => 0 resultados.
    const excluded = await requestJson(`/api/v1/lands?province=${province.toLowerCase()}&priceMax=100`);
    expect(excluded.payload.data.items).toHaveLength(0);
  });

  // #135 (A-5): la auditoría se persiste en Mongo y la lectura Mongoose la ve.
  it("persists audit events to Mongo and exposes them via /audit-events", async () => {
    const create = await requestJson("/api/v1/lands", {
      method: "POST",
      headers: { "x-dev-user-id": "user_audit_owner" },
      body: {
        title: "Terreno auditado",
        area: 30,
        allowedUses: ["ganaderia"],
        location: { province: "Coclé", district: "Penonomé" },
        priceRule: { currency: "USD", pricePerMonth: 600 },
      },
    });
    const landId = create.payload.data.id;

    const audit = await requestJson("/api/v1/audit-events?entity=land&action=created", {
      headers: { "x-dev-user-id": "admin_audit", "x-dev-role": "admin" },
    });
    expect(audit.response.status).toBe(200);
    const found = audit.payload.data.some(
      (e: { entityId: string; action: string }) => e.entityId === landId && e.action === "created",
    );
    expect(found).toBe(true);
  });

  // #138: el seed sirve operación/venta y atributos reales (agua/acceso/características).
  it("serves sale operation and real attributes from the seed", async () => {
    const { response, payload } = await requestJson("/api/v1/lands/land_seed_02");

    expect(response.status).toBe(200);
    expect(payload.data.operation).toBe("ambas");
    expect(payload.data.salePrice).toBe(145000);
    expect(typeof payload.data.water).toBe("string");
    expect(typeof payload.data.access).toBe("string");
    expect(Array.isArray(payload.data.features)).toBe(true);
    expect(payload.data.features.length).toBeGreaterThan(0);
  });

  // #138: los campos nuevos hacen round-trip al crear un terreno.
  it("round-trips operation/salePrice/water/access/features on create", async () => {
    const create = await requestJson("/api/v1/lands", {
      method: "POST",
      headers: { "x-dev-user-id": "user_sale_owner" },
      body: {
        title: "Terreno en venta",
        area: 80,
        allowedUses: ["agricultura"],
        location: { province: "Chiriquí", district: "Boquete" },
        priceRule: { currency: "USD", pricePerMonth: 900 },
        operation: "venta",
        salePrice: 175000,
        water: "Río permanente",
        access: "Carretera asfaltada",
        features: ["Suelo fértil", "Clima de altura"],
      },
    });

    expect(create.response.status).toBe(201);
    expect(create.payload.data.operation).toBe("venta");
    expect(create.payload.data.salePrice).toBe(175000);
    expect(create.payload.data.water).toBe("Río permanente");
    expect(create.payload.data.features).toEqual(["Suelo fértil", "Clima de altura"]);

    // Persistido: se recupera con GET.
    const fetched = await requestJson(`/api/v1/lands/${create.payload.data.id}`);
    expect(fetched.payload.data.operation).toBe("venta");
    expect(fetched.payload.data.salePrice).toBe(175000);
  });

  // #138: si no se envía operación, por defecto es alquiler.
  it("defaults operation to alquiler when omitted", async () => {
    const create = await requestJson("/api/v1/lands", {
      method: "POST",
      headers: { "x-dev-user-id": "user_default_op" },
      body: {
        title: "Terreno sin operación explícita",
        area: 20,
        allowedUses: ["ganaderia"],
        location: { province: "Herrera", district: "Chitré" },
        priceRule: { currency: "USD", pricePerMonth: 300 },
      },
    });

    expect(create.response.status).toBe(201);
    expect(create.payload.data.operation).toBe("alquiler");
  });
});
