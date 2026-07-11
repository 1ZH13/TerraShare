import { env } from "./config/env";
import { enforceProductionSecurity } from "./config/security-check";
import { connectMongoose } from "./db/mongoose";
import { createApp } from "./app";
import { seedDatabase } from "./db/seed";
import { Land } from "./db/schemas";

// Verificación de seguridad de despliegue (#141): aborta el arranque si la
// configuración de producción es insegura (p. ej. bypass de auth activo).
enforceProductionSecurity({
  isProduction: env.isProduction,
  allowDevAuthBypass: env.allowDevAuthBypass,
  corsAllowedOrigins: env.corsAllowedOrigins,
  stripeConfigured: env.stripeConfigured,
  webhookSecretConfigured: !!env.stripeWebhookSecret && env.stripeWebhookSecret !== "whsec_placeholder",
});

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