/**
 * Puebla la base de desarrollo con el juego de datos de demostración (#356).
 *
 *   bun run seed:demo
 *   SEED_MAIN_CLERK_ID=user_xxx bun run seed:demo   # sembrar contra otra cuenta
 *
 * BORRA las colecciones de negocio antes de escribir. Se niega a ejecutarse con
 * NODE_ENV=production salvo que se pase --force, para que un despiste no vacíe
 * una base real.
 */
import mongoose from "mongoose";

import { connectMongoose } from "../src/db/mongoose";
import { seedDemoDatabase } from "../src/db/seed-demo";
import { migrateUp } from "../src/lib/migrator";

const force = process.argv.includes("--force");

if (process.env.NODE_ENV === "production" && !force) {
  console.error("[seed-demo] Abortado: NODE_ENV=production. Usa --force si de verdad quieres borrar y repoblar.");
  process.exit(1);
}

async function main(): Promise<void> {
  await connectMongoose();
  console.log(`[seed-demo] Conectado a ${mongoose.connection.name}`);

  // Los índices deben estar al día ANTES de escribir: si queda alguno obsoleto
  // (como el `users.id_1` que retiró la migración 002) la inserción revienta.
  const applied = await migrateUp(mongoose.connection.db!);
  if (applied.length > 0) {
    console.log(`[seed-demo] Migraciones aplicadas: ${applied.join(", ")}`);
  }

  const result = await seedDemoDatabase();

  if (result.droppedGhostCollections.length > 0) {
    console.log(`[seed-demo] Colecciones fantasma eliminadas: ${result.droppedGhostCollections.join(", ")}`);
  }

  console.log("[seed-demo] Documentos insertados:");
  for (const [name, count] of Object.entries(result.counts)) {
    console.log(`  ${name.padEnd(16)} ${count}`);
  }

  await mongoose.disconnect();
  console.log("[seed-demo] Listo.");
}

main().catch(async (error) => {
  console.error("[seed-demo] Falló:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
