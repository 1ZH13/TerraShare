// Test preload: spins up an in-memory MongoDB, connects both data layers
// (native driver + mongoose), and seeds it from the in-memory store fixtures
// before every test. Wired via bunfig.toml `[test].preload`.
// Primero de todo: fija las variables de entorno que `config/env` valida al
// evaluarse. Cualquier import que arrastre `env` debe venir después.
import "./setup-test-env";

import { afterAll, beforeEach } from "bun:test";
import { MongoMemoryServer } from "mongodb-memory-server";

import mongoose from "mongoose";
import { connectMongoose, disconnectMongoose } from "./db/mongoose";
import { __resetRateLimit } from "./middleware/rate-limit";
import { invalidateSecuritySettingsCache } from "./lib/security-settings";
import { getStore, resetStore } from "./store/in-memory-db";

// Maps the in-memory store collections to the Mongo collection names the routes
// actually read from. Mongoose auto-pluralizes model names (RentalRequest ->
// "rentalrequests"), so we seed those lowercased names; lands/contracts/payments/
// chats share the same name across both layers.
function fixtures(): Record<string, Record<string, unknown>[]> {
  const store = getStore();
  return {
    lands: [...store.lands.values()],
    rentalrequests: [...store.rentalRequests.values()],
    contracts: [...store.contracts.values()],
    payments: [...store.payments.values()],
    chats: [...store.chats.values()],
    chatmessages: [...store.chatMessages.values()].flat(),
    auditevents: [...store.auditEvents.values()],
    // Incluida aunque el store no la siembre: así la colección se vacía entre
    // tests y las notificaciones que crea un test no se filtran al siguiente.
    notifications: [...store.notifications.values()],
    // El panel de seguridad guarda aquí la exigencia de 2FA (#362). Se vacía
    // entre tests para que un ajuste no se filtre y bloquee al siguiente.
    appsettings: [],
  } as unknown as Record<string, Record<string, unknown>[]>;
}

async function seedDatabase(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;
  for (const [collection, docs] of Object.entries(fixtures())) {
    await db.collection(collection).deleteMany({});
    if (docs.length > 0) {
      // Spread each doc so insertMany's injected _id never mutates the store.
      await db.collection(collection).insertMany(docs.map((doc) => ({ ...doc })));
    }
  }
}

const mongod = await MongoMemoryServer.create();
process.env.MONGODB_URI = `${mongod.getUri()}terrashare`;

await connectMongoose();
await seedDatabase();

beforeEach(async () => {
  // Normalize the in-memory store, then mirror it into Mongo for test isolation.
  resetStore();
  // Reset the module-level rate-limit counter so cumulative suite requests from
  // the shared test IP don't trip the IP limit and cause spurious 429s.
  __resetRateLimit();
  // La caché de ajustes de seguridad guarda el valor 10 s; si no se limpia, un
  // test arrastra la configuración del anterior.
  invalidateSecuritySettingsCache();
  await seedDatabase();
});

afterAll(async () => {
  await disconnectMongoose();
  await mongod.stop();
});
