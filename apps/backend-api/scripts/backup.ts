/**
 * CLI de respaldos cifrados de MongoDB (HU-56 #174).
 *
 *   bun scripts/backup.ts create        # crea un respaldo cifrado y lo registra
 *   bun scripts/backup.ts verify [id]   # restauración probada (último si se omite id)
 *   bun scripts/backup.ts list          # historial de respaldos
 *
 * Pensado para correr por cron en el host (respaldos periódicos + verificación
 * por ciclo). Lee `MONGODB_URI`, `BACKUP_ENCRYPTION_KEY` y `BACKUP_DIR` del
 * entorno (Bun carga `.env` automáticamente). Ejemplo de crontab:
 *
 *   # Respaldo diario a las 03:00 y verificación semanal los lunes 03:30
 *   0 3 * * *  cd /app/apps/backend-api && bun scripts/backup.ts create
 *   30 3 * * 1 cd /app/apps/backend-api && bun scripts/backup.ts verify
 */
import mongoose from "mongoose";

import { connectMongoose, disconnectMongoose } from "../src/db/mongoose";
import { createBackup, verifyRestore } from "../src/lib/backup";
import { BackupRecord } from "../src/db/schemas";

async function main(): Promise<void> {
  const command = process.argv[2] ?? "list";
  await connectMongoose();
  const db = mongoose.connection.db;
  if (!db) throw new Error("No hay conexión a MongoDB");

  switch (command) {
    case "create": {
      const result = await createBackup(db);
      await BackupRecord.create({
        id: result.id,
        fileName: result.fileName,
        sizeBytes: result.sizeBytes,
        checksum: result.checksum,
        algorithm: result.algorithm,
        collections: result.collections,
        status: "completed",
        createdBy: "system:cron",
        verifyStatus: "pending",
      });
      const totalDocs = result.collections.reduce((sum, col) => sum + col.count, 0);
      console.log(
        `✓ Respaldo ${result.id} (${result.collections.length} colecciones, ${totalDocs} docs, ${result.sizeBytes} bytes)`,
      );
      break;
    }
    case "verify": {
      const id = process.argv[3];
      const record = id
        ? await BackupRecord.findOne({ id })
        : await BackupRecord.findOne().sort({ createdAt: -1 });
      if (!record) {
        console.error("No hay respaldos que verificar.");
        process.exitCode = 1;
        break;
      }
      const verification = await verifyRestore(record.fileName, { expectedChecksum: record.checksum });
      record.verifyStatus = verification.ok ? "passed" : "failed";
      record.lastVerifiedAt = new Date(verification.checkedAt);
      record.verifyDetail = {
        checksumOk: verification.checksumOk,
        collections: verification.collections,
        error: verification.error,
      };
      await record.save();
      const mark = verification.ok ? "✓" : "✗";
      console.log(`${mark} Verificación de ${record.id}: ${verification.ok ? "OK" : "FALLÓ"}`);
      if (!verification.ok) {
        console.error(verification.error ?? JSON.stringify(verification.collections, null, 2));
        process.exitCode = 1;
      }
      break;
    }
    case "list": {
      const records = await BackupRecord.find().sort({ createdAt: -1 }).lean();
      if (records.length === 0) {
        console.log("Sin respaldos.");
        break;
      }
      for (const r of records) {
        const verified = r.lastVerifiedAt
          ? `${r.verifyStatus} @ ${new Date(r.lastVerifiedAt).toISOString()}`
          : "sin verificar";
        console.log(`${r.id}  ${r.sizeBytes}B  [${verified}]`);
      }
      break;
    }
    default:
      console.error(`Comando desconocido: ${command}. Usa create | verify | list.`);
      process.exitCode = 1;
  }

  await disconnectMongoose();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
