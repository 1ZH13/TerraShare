/**
 * CLI de migraciones de base de datos (#173).
 *
 *   bun scripts/migrate.ts status   # lista migraciones y su estado
 *   bun scripts/migrate.ts up       # aplica las pendientes
 *   bun scripts/migrate.ts down [n] # revierte las últimas n (por defecto 1)
 *
 * Lee `MONGODB_URI` del entorno (Bun carga `.env` automáticamente).
 */
import mongoose from "mongoose";

import { connectMongoose, disconnectMongoose } from "../src/db/mongoose";
import { migrateDown, migrateUp, migrationStatus } from "../src/lib/migrator";

async function main(): Promise<void> {
  const command = process.argv[2] ?? "status";
  await connectMongoose();
  const db = mongoose.connection.db;
  if (!db) throw new Error("No hay conexión a MongoDB");

  switch (command) {
    case "up": {
      const ran = await migrateUp(db);
      console.log(ran.length ? `Aplicadas: ${ran.join(", ")}` : "Sin migraciones pendientes.");
      break;
    }
    case "down": {
      const steps = Number(process.argv[3] ?? "1");
      const reverted = await migrateDown(db, { steps });
      console.log(reverted.length ? `Revertidas: ${reverted.join(", ")}` : "Nada que revertir.");
      break;
    }
    case "status": {
      const status = await migrationStatus(db);
      for (const entry of status) {
        const mark = entry.applied ? "✓" : "·";
        const when = entry.appliedAt ? ` (${entry.appliedAt.toISOString()})` : "";
        console.log(`${mark} ${entry.id} ${entry.name}${when}`);
      }
      break;
    }
    default:
      console.error(`Comando desconocido: ${command}. Usa status | up | down [n].`);
      process.exitCode = 1;
  }

  await disconnectMongoose();
}

main().catch((err) => {
  console.error("Migración falló:", err);
  process.exit(1);
});
