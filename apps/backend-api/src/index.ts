import { env } from "./config/env";
import { connectDatabase, getDatabase } from "./config/database";
import { createApp } from "./app";
import { seedDatabase } from "./db/seed";

const app = createApp();

async function init() {
  try {
    const db = await connectDatabase();
    
    if (db) {
      console.log("[backend-api] Using MongoDB database");
      
      const needsSeed = (await db.collection("lands").countDocuments()) === 0;
      if (needsSeed || process.env.FORCE_SEED === "true") {
        console.log("[backend-api] Database is empty, running seed...");
        await seedDatabase();
      } else {
        console.log("[backend-api] Database already has data, skipping seed");
      }
    } else {
      console.warn("[backend-api] MongoDB connection failed, using fallback");
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