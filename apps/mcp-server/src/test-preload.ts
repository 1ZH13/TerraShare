// Test preload: MongoDB en memoria + siembra de terrenos para probar las tools
// de forma aislada, sin depender de un backend en marcha. (#234)
import { afterAll, beforeEach } from "bun:test";
import { MongoMemoryServer } from "mongodb-memory-server";

import { connectMongoose, disconnectMongoose } from "@backend/db/mongoose";
import { Land } from "@backend/db/schemas";

const now = new Date().toISOString();

function land(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: `land_${Math.random().toString(36).slice(2, 8)}`,
    ownerId: "user_seed",
    title: "Terreno de prueba",
    description: "Descripción",
    area: 10,
    allowedUses: ["agricultura"],
    location: { province: "Panama", district: "Panama" },
    availability: {},
    priceRule: { currency: "USD", pricePerMonth: 500 },
    status: "active",
    operation: "alquiler",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export const SEED_LANDS = [
  land({ id: "land_a", title: "Finca agrícola en Chiriquí", location: { province: "Chiriqui", district: "David" }, allowedUses: ["agricultura"], priceRule: { currency: "USD", pricePerMonth: 300 } }),
  land({ id: "land_b", title: "Potrero ganadero", location: { province: "Chiriqui", district: "Boquete" }, allowedUses: ["ganaderia"], priceRule: { currency: "USD", pricePerMonth: 800 }, operation: "venta", salePrice: 90000 }),
  land({ id: "land_c", title: "Parcela forestal", location: { province: "Cocle", district: "Penonome" }, allowedUses: ["forestal"], priceRule: { currency: "USD", pricePerMonth: 1200 } }),
  land({ id: "land_inactive", title: "Terreno inactivo", status: "inactive", location: { province: "Panama", district: "Panama" } }),
];

const mongod = await MongoMemoryServer.create();
process.env.MONGODB_URI = `${mongod.getUri()}terrashare_mcp`;

await connectMongoose();

async function seed(): Promise<void> {
  await Land.deleteMany({});
  await Land.insertMany(SEED_LANDS.map((l) => ({ ...l })));
}

await seed();
beforeEach(seed);

afterAll(async () => {
  await disconnectMongoose();
  await mongod.stop();
});
