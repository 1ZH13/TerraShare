import mongoose from "mongoose";

import { env } from "./config/env";
import { enforceProductionSecurity } from "./config/security-check";
import { connectMongoose } from "./db/mongoose";
import { createApp } from "./app";
import { seedDatabase } from "./db/seed";
import { migrateUp } from "./lib/migrator";
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
    if (env.forceSeed || (needsSeed && env.allowAutoSeed)) {
      console.log("[backend-api] Base de datos vacía o siembra forzada: sembrando…");
      await seedDatabase();
    } else if (needsSeed) {
      // BD vacía pero el auto-seed está desactivado (producción por defecto).
      // NO sembramos datos demo encima: una prod vacía casi siempre es un fallo
      // (volumen de Mongo perdido), y rellenarla en silencio ocultaría la pérdida
      // de datos reales. Avisamos con fuerza en su lugar (#453).
      console.error(
        "[backend-api] La base de datos está VACÍA y el auto-seed está desactivado " +
          "(ALLOW_AUTO_SEED=false). No se siembran datos demo. Si esto es inesperado, " +
          "revisa el volumen de Mongo y restaura desde un respaldo antes de continuar. " +
          "Para sembrar a propósito, arranca con FORCE_SEED=true.",
      );
    } else {
      console.log("[backend-api] La base de datos ya tiene datos; se omite el seed");
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