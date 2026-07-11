import mongoose from "mongoose";

import { env } from "./config/env";
import { connectMongoose } from "./db/mongoose";
import { createApp } from "./app";
import { seedDatabase } from "./db/seed";
import { migrateUp } from "./lib/migrator";
import { Land } from "./db/schemas";

const app = createApp();

async function init() {
  try {
    await connectMongoose();
    console.log("[backend-api] Using MongoDB database (Mongoose)");

    // Migraciones versionadas (#173): aplica las pendientes al arrancar, de forma
    // idempotente. Se puede desactivar con RUN_MIGRATIONS=false (p. ej. si se
    // corren en un paso de despliegue aparte).
    if (process.env.RUN_MIGRATIONS !== "false") {
      const db = mongoose.connection.db;
      if (db) {
        const applied = await migrateUp(db);
        if (applied.length > 0) {
          console.log(`[backend-api] Migraciones aplicadas: ${applied.join(", ")}`);
        }
      }
    }

    const needsSeed = (await Land.estimatedDocumentCount()) === 0;
    if (needsSeed || process.env.FORCE_SEED === "true") {
      console.log("[backend-api] Database is empty, running seed...");
      await seedDatabase();
    } else {
      console.log("[backend-api] Database already has data, skipping seed");
    }
  } catch (error) {
    console.warn("[backend-api] Failed to connect to MongoDB:", error);
  }

  console.log(`[backend-api] listening on port ${env.apiPort}`);
}

init();

export default {
  port: env.apiPort,
  fetch: app.fetch,
};