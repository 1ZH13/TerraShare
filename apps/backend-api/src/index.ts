import { env } from "./config/env";
import { connectMongoose } from "./db/mongoose";
import { createApp } from "./app";
import { seedDatabase } from "./db/seed";
import { Land } from "./db/schemas";

const app = createApp();

async function init() {
  try {
    await connectMongoose();
    console.log("[backend-api] Using MongoDB database (Mongoose)");

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